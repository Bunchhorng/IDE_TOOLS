import { Fragment } from 'react';
import type { SessionSegment } from '../../lib/prompts';

/**
 * Renders a terminal-style session: program output with the user's typed
 * input echoed inline right after each prompt — like a real console.
 */
export function TerminalSession({ segments }: { segments: SessionSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
      {segments.map((seg, i) =>
        seg.type === 'in' ? (
          <span key={i} className="text-primary font-semibold">{seg.text}</span>
        ) : (
          <Fragment key={i}>
            <span className="text-ink">{seg.text}</span>
            {/* A prompt ends the segment; newline comes with the next out/in. */}
          </Fragment>
        ),
      )}
    </pre>
  );
}
