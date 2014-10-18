# rvlvvr-client

## setup

Install keybase locally https://keybase.io/docs/command_line/installation

Note: If you already have a secret key installed with gpg on your system, make sure the one you're using for this application is password-less. This will be fixed eventually but it'll be annoying for the time being.

After installing keybase locally, run:

    keybase login
    keybase pull

Then set up the local server:

    npm install
    cp local.json-dist local.json

Change the `me` field in local.json to your username on keybase (not email).

    npm start