#!/usr/bin/env python3
"""PTY bridge: attach a command to a pseudo-terminal and relay bytes."""
import fcntl
import os
import select
import signal
import struct
import sys
import termios

RS = b'\x1c'  # control-packet sentinel (File Separator)


def arg(name, default=None):
    try:
        index = sys.argv.index(name)
    except ValueError:
        return default
    if index + 1 < len(sys.argv):
        return sys.argv[index + 1]
    return default


cmd = arg('--cmd', '')
inpipe = arg('--in', '/app/control.fifo')
outfile = arg('--out', '/app/stdout.txt')
pidfile = arg('--pid', '/app/pid.txt')
rows = int(arg('--rows', '0') or 0)
cols = int(arg('--cols', '0') or 0)
max_bytes = int(arg('--max', '0') or 0)

master, slave = os.openpty()

attrs = termios.tcgetattr(slave)
# IUTF8 is Linux-specific and missing from some Python builds — guard it.
attrs[0] = termios.IXON | termios.ICRNL | getattr(termios, 'IUTF8', 0)
attrs[1] = termios.OPOST | termios.ONLCR
# 8-bit chars + receiver enabled + ignore modem control (safe pty cflags).
attrs[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
# Real interactive editor: ECHO with ECHOE/ECHOK/ECHOCTL so Backspace erases
# on screen (ECHOE echoes "\b \b" instead of a stray DEL byte) and Ctrl+C
# prints as ^C. Without ECHOE the line buffer DOES erase but the typed text
# never visually disappears — the "can't backspace" symptom.
attrs[3] = (termios.ECHO | termios.ECHOE | termios.ECHOK | termios.ICANON
            | termios.ISIG | termios.IEXTEN
            | getattr(termios, 'ECHOCTL', 0) | getattr(termios, 'ECHOKE', 0))
# Backspace key: xterm.js sends DEL (0x7f). Make it the explicit erase char.
attrs[6][termios.VERASE] = 0x7f
termios.tcsetattr(slave, termios.TCSANOW, attrs)

# Only the master is non-blocking (per-open-file-description): the child's
# slave stays blocking, so normal reads keep working, while big pastes cannot
# wedge the bridge on a full pty input buffer.
os.set_blocking(master, False)

if 0 < rows <= 1000 and 0 < cols <= 5000 and (rows or cols):
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))

child = os.fork()
if child == 0:
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    if slave > 2:
        os.close(slave)
    os.close(master)
    # `exec` makes the program itself the session/process-group leader, so a
    # SIGINT raised by Ctrl+C hits exactly the program (and its children) —
    # never the sh wrapper, which would otherwise report an extra death.
    os.execvp('/bin/sh', ['sh', '-c', 'exec ' + cmd])
    os._exit(127)

os.close(slave)
try:
    open(pidfile, 'w').write(str(child))
except OSError:
    pass

# Open the fifo read+write so host-side writers never block on a missing
# reader, even in the brief window after the program has exited.
try:
    infd = os.open(inpipe, os.O_RDWR | os.O_NONBLOCK)
except OSError:
    infd = -1

out = os.fdopen(os.open(outfile, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644), 'wb', buffering=0)


def kill_child(_signum=None, _frame=None):
    try:
        os.killpg(child, signal.SIGKILL)
    except OSError:
        pass


signal.signal(signal.SIGTERM, kill_child)
signal.signal(signal.SIGINT, kill_child)


def write_bytes(fd, data):
    # Some clients/platforms send plain BS (^H, 0x08) for Backspace instead of
    # DEL (0x7f). Normalize it to DEL so the pty's canonical erase always fires.
    data = data.replace(b'\x08', b'\x7f')
    while data:
        try:
            written = os.write(fd, data)
        except BlockingIOError:
            select.select([], [fd], [])
            continue
        except OSError:
            return
        data = data[written:]


def mark_truncated():
    global truncated_flag
    if truncated_flag:
        return
    truncated_flag = True
    try:
        open('/app/truncated.txt', 'w').write('1')
    except OSError:
        pass


def drain_master():
    global written
    try:
        data = os.read(master, 65536)
    except OSError:
        return False
    if not data:
        return False
    if written >= max_bytes:
        mark_truncated()
    else:
        room = max_bytes - written
        out.write(data[:room])
        written += len(data[:room])
        if len(data) > room:
            mark_truncated()
    return True


buf = b''
written = 0
truncated_flag = False
status = None
while status is None:
    fds = [master]
    if infd >= 0:
        fds.append(infd)
    ready, _, _ = select.select(fds, [], [])
    if infd >= 0 and infd in ready:
        try:
            buf += os.read(infd, 65536)
        except OSError:
            pass
        while True:
            if buf[:1] == RS:
                if len(buf) < 9:
                    break
                rows_n, cols_n = struct.unpack('<II', buf[1:9])
                try:
                    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', rows_n, cols_n, 0, 0))
                except OSError:
                    pass
                buf = buf[9:]
                continue
            marker = buf.find(RS)
            if marker < 0:
                break
            write_bytes(master, buf[:marker])
            buf = buf[marker:]
        if buf and buf[:1] != RS:
            write_bytes(master, buf)
            buf = b''
    if master in ready:
        drain_master()
    try:
        waited, st = os.waitpid(child, os.WNOHANG)
    except OSError:
        break
    if waited == child:
        status = st

# The child may have a few buffered bytes still in the pty after it exits —
# keep draining (bounded) so the very last output is not lost.
while True:
    ready, _, _ = select.select([master], [], [], 0.15)
    if not ready:
        break
    if not drain_master():
        break
out.close()

if status is None:
    code = 137
elif os.WIFEXITED(status):
    code = os.WEXITSTATUS(status)
elif os.WIFSIGNALED(status):
    code = 128 + os.WTERMSIG(status)
else:
    code = 137
sys.exit(code)