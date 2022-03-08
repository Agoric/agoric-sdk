#!/bin/sh
# Generate PNGs from PlantUML files and put put into the Markdown

CMD="java -jar ${PLANTUML:-$HOME/plantuml/plantuml.jar}"
if command -v plantuml; then
    # e.g. from `brew install plantuml`
    CMD=plantuml
fi

$CMD "./**/*.puml"

page="README.md"
echo "# Threat Model Diagrams" > "$page"
for diag in $(find . -name "*.png" | sort); do
    echo "## $diag\n" >> "$page"
    echo "[![$diag]($diag)]($diag)\n" >> "$page"
done
