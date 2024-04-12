#!/bin/sh

pumljar="${PLANTUML:-$HOME/plantuml/plantuml.jar}"
page="index.md"
java -jar "$pumljar" "./**/*.puml"
echo "# Governance Diagrams" > "$page"
for diag in $(find . -name "*.png" | sort); do
  echo "## $diag\n" >> "$page"
  echo "[![$diag]($diag)]($diag)\n" >> "$page"
done
