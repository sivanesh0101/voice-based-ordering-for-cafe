#!/bin/bash
git add .
git commit -m "Auto-update on $(Get-Date)"
git push origin master
