#!/bin/bash
echo "Copying email templates..."
mkdir -p dist/templates/email
cp -r src/templates/email/*.hbs dist/templates/email/
echo "Templates copied successfully!"
