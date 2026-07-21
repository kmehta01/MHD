const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  complaintAttachmentDownloadLimiter,
  profilePhotoUploadLimiter,
} = require("../src/middlewares/rate-limit.middleware");

test("limits attachment downloads for an authenticated user", async () => {
  const app = express();

  app.get(
    "/download",
    (req, res, next) => {
      req.user = { id: 987654321 };
      next();
    },
    complaintAttachmentDownloadLimiter,
    (req, res) => res.json({ status: true }),
  );

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () =>
      resolve(listeningServer),
    );
  });

  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/download`;

    for (let requestNumber = 1; requestNumber <= 30; requestNumber += 1) {
      const response = await fetch(url);
      assert.equal(response.status, 200);
    }

    const limitedResponse = await fetch(url);
    const body = await limitedResponse.json();

    assert.equal(limitedResponse.status, 429);
    assert.deepEqual(body, {
      status: false,
      message: "Too many attachment downloads. Please try again later.",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("limits profile picture uploads for an authenticated user", async () => {
  const app = express();
  app.post(
    "/profile/photo",
    (req, res, next) => {
      req.user = { id: 987654322 };
      next();
    },
    profilePhotoUploadLimiter,
    (req, res) => res.json({ status: true }),
  );
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => resolve(listeningServer));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/profile/photo`;
    for (let requestNumber = 1; requestNumber <= 20; requestNumber += 1) {
      assert.equal((await fetch(url, { method: "POST" })).status, 200);
    }
    const limitedResponse = await fetch(url, { method: "POST" });
    assert.equal(limitedResponse.status, 429);
    assert.deepEqual(await limitedResponse.json(), {
      status: false,
      message: "Too many profile picture uploads. Please try again later.",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
