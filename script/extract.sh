#!/bin/bash

# Check if the version argument is provided
if [ -z "$1" ]; then
  echo "Usage: npm run extract <version>"
  exit 1
fi

version=$1

echo "Downloading version manifest..."

version_manifest=$(curl -s "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")

if [ -z "$version_manifest" ]; then
  echo "Failed to fetch version manifest. Please check your internet connection."
  exit 1
fi

version_url=$(echo "$version_manifest" | jq -r ".versions[] | select(.id == \"$version\") | .url")

if [ -z "$version_url" ]; then
  echo "Version $version not found."
  exit 1
fi

echo "Downloading version metadata..."

version_json=$(curl -s "$version_url")

if [ -z "$version_json" ]; then
  echo "Failed to fetch $version."
  exit 1
fi

echo "Downloading jar..."

jar_url=$(echo "$version_json" | jq -r ".downloads.client.url")

if [ -z "$jar_url" ]; then
  echo "Failed to find JAR url."
  exit 1
fi

tmp=$(mktemp -d)

curl -s "$jar_url" -o "$tmp/jar"

echo "Extracting..."

mkdir -p "extracted/$version/loot_tables"
unzip -j "$tmp/jar" 'data/minecraft/loot_tables/blocks/*' -d "extracted/$version/loot_tables"

mkdir -p "extracted/$version/recipes"
unzip -j "$tmp/jar" 'data/minecraft/recipes/*' -d "extracted/$version/recipes"

echo "Done."
