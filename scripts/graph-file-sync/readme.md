# IPFS-SYNC
The Graph requires that all ipfs files are pinned on their ipfs node. This means that whatever ipfs files are uploaded,
they need to be sync'd to over to the graph's ipfs node.

## Install ipfs-sync
    npm install -g @graphprotocol/ipfs-sync

## Sync single file
    ipfs-sync sync-files --from http://127.0.0.1:8080 --to https://api.thegraph.com/ipfs/ --file-list ./single-file