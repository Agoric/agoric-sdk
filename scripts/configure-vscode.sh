#!/bin/sh

# Configures the .vscode directory (which is .gitignored so that everyone can tailor it)

die() {
	echo "$*" >&2
	exit 1
}

cd "$(dirname "$0")"/../.. ||
	die "Could not cd to top-level directory"

mkdir -p .vscode ||
	die "Could not create .vscode/"

# General settings

cat >.vscode/settings.json.new <<\EOF ||
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifierEnding": "js"
}
EOF
	die "Could not write settings.json"

for file in .vscode/settings.json; do
	if test -f $file; then
		if git diff --no-index --quiet --exit-code $file $file.new; then
			echo "Your existing configuration matches the recommendations."
			rm $file.new
		else
			printf "The file $file.new has these changes:\n\n"
			git --no-pager diff --no-index $file $file.new
			printf "\n\nTo overwrite yours:\n\n  mv $file.new $file\n\n"
		fi
	else
		mv $file.new $file
	fi
done
