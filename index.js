const pooledDownload = async (connect, save, downloadList, maxConcurrency) => {
  // Create a pool of connections
  const connections = [];

  while (maxConcurrency) {
    try {
      connections.push(await connect());
    } catch (error) {
      throw new Error("connection failed");
    }
    maxConcurrency--;
  }

  const downloads = [];
  const _downloadList = [...downloadList];

  while (_downloadList.length) {
    if (connections.length) {
      downloads.push(_download(_downloadList, connections, save));
    } else if (downloads.length) {
      // Download files and do not break if any file download fails
      await Promise.all(downloads).then((result) => {
        // Clear after download or failed all
        downloads.length = 0;
      });
    }
  }

  if (downloads.length) {
    // Download files and do not break if any file download fails
    await Promise.all(downloads).then((result) => {
      // Clear after download or failed all
      downloads.length = 0;
    });
  }

  // Close all connections in the pool
  await Promise.all(connections.map((connection) => connection.close()));
};

async function _download(downloadList, connections, save) {
  const connection = connections.pop(); // Get a connection from the pool
  const { download, close } = connection;
  const url = downloadList.pop();

  try {
    await download(url).then((result) => save(result));
  } catch (error) {
    console.log(error);

    // Push back if the url download fails
    // downloadList.push(url); can be used for retry
  } finally {
    connections.push(connection); // Return the connection to the pool
  }
}

module.exports = pooledDownload;
