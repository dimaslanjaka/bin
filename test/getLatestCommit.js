import { getLatestCommit } from "../src/package-resolutions-updater.mjs";

getLatestCommit("dimaslanjaka", "bin", "master")
  .then((commit) => {
    console.log("Latest commit on master branch of dimaslanjaka/bin:");
    console.log(`SHA: ${commit.sha}`);
    console.log(`Date: ${commit.date}`);
  })
  .catch((error) => {
    console.error("Error fetching latest commit:", error);
  });
