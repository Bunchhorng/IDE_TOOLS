#!/bin/sh
set -e

cd "$(dirname "$0")"

echo "Building executor images..."

echo "Building coderunner/c..."
docker build -t coderunner/c:latest ./c

echo "Building coderunner/cpp..."
docker build -t coderunner/cpp:latest ./cpp

echo "Building coderunner/python..."
docker build -t coderunner/python:latest ./python

echo "Done."