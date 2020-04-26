import {
  generateRandomSpeed,
  generateRandomXPosition,
  draw3DHand,
  moveHands,
  initRenderer,
  initLights,
  render,
  updateStartButton,
  initTrailOptions,
  loadPoseNet,
  initSounds,
  guiState,
  generateFruits,
  loadFruitsModels,
  onWindowResize,
  initSceneGeometry,
  initScene,
  initTrailRenderers,
} from "./utils.js";
const hands = [];
let fruit;
let handMesh;
let score = 0;
let canvas = document.getElementById("output");

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

window.onload = async () => {
  initSounds();

  lastTrailUpdateTime = performance.now();
  lastTrailResetTime = performance.now();

  await loadPoseNet();
  initScene();
  initTrailOptions();
  initLights();
  loadFruitsModels();

  updateStartButton();
  initRenderer();

  initSceneGeometry(function () {
    initTrailRenderers(function () {
      //   animate();
    });
  });
  //   initSceneGeometry(function () {
  //     initTrailRenderers();
  //   });
};

const detectPoseInRealTime = (video, net) => {
  const flipHorizontal = false;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  async function poseDetectionFrame() {
    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case "single-pose":
        const pose = await guiState.net.estimateSinglePose(
          video,
          imageScaleFactor,
          flipHorizontal,
          outputStride
        );
        poses.push(pose);

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
    }

    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          const leftWrist = keypoints.find((k) => k.part === "leftWrist");
          const rightWrist = keypoints.find((k) => k.part === "rightWrist");

          if (leftWrist) {
            const hasLeftHand = hands.find((hand) => hand.name === "leftHand");

            if (!hasLeftHand) {
              handMesh = draw3DHand();
              //   handMesh = trailTarget;
              hands.push({
                mesh: handMesh,
                coordinates: leftWrist.position,
                name: "leftHand",
              });
              scene.add(handMesh);
            }

            const leftHandIndex = hands.findIndex(
              (hand) => hand.name === "leftHand"
            );

            leftHandIndex !== -1 &&
              (hands[leftHandIndex].coordinates = leftWrist.position);
          }

          //   if (rightWrist) {
          //     const hasRightHand = hands.find(
          //       (hand) => hand.name === "rightHand"
          //     );

          //     if (!hasRightHand) {
          //       handMesh = draw3DHand();
          //       hands.push({
          //         mesh: handMesh,
          //         coordinates: rightWrist.position,
          //         name: "rightHand",
          //       });
          //       scene.add(handMesh);
          //     }
          //     const rightHandIndex = hands.findIndex(
          //       (hand) => hand.name === "rightHand"
          //     );

          //     rightHandIndex !== -1 &&
          //       (hands[rightHandIndex].coordinates = rightWrist.position);
          //   }

          //   moveHands(hands, camera, fruitsObjects);
        }
      }
    });
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
};

const animate = () => {
  requestAnimationFrame(animate);

  var time = performance.now();
  updateTrailTarget(time);

  if (fruitsObjects) {
    fruitsObjects.map((fruit, index) => {
      // fruit.rotation.x += 0.02;
      // fruit.rotation.y += 0.02;

      if (fruit.direction === "up") {
        fruit.position.y += fruit.speed;
      }
      if (
        fruit.position.y > -700 &&
        !fruit.soundPlayed &&
        fruit.direction === "up"
      ) {
        newFruitSound.play();
        fruit.soundPlayed = true;
      }
      if (fruit.position.y > 500) {
        fruit.direction = "down";
      }
      if (fruit.direction === "down") {
        fruit.position.y -= fruit.speed;
      }

      if (fruit.position.y < -900) {
        scene.remove(fruit);
        fruitsObjects.splice(index, 1);
      }
    });
    if (fruitsObjects.length === 0) {
      fruit && (fruit.direction = "up");
      fruit && generateFruits();
    }
  }

  //   window.onmousemove = (e) => {
  //     var vec = new THREE.Vector3(); // create once and reuse
  //     var pos = new THREE.Vector3(); // create once and reuse

  //     vec.set(
  //       (e.clientX / window.innerWidth) * 2 - 1,
  //       -(e.clientY / window.innerHeight) * 2 + 1,
  //       100
  //     );

  //     vec.unproject(camera);
  //     vec.sub(camera.position).normalize();
  //     var distance = -camera.position.z / vec.z;
  //     let newPos = pos.copy(camera.position).add(vec.multiplyScalar(distance));

  //     trailTarget.position.x = vec.x;
  //     trailTarget.position.y = vec.y;
  //     trailTarget.position.z = vec.z;

  //     if (hands) {
  //       let test = moveHands(hands, camera, fruitsObjects, e);

  //       if (test.includes(true)) {
  //         console.log("touched fruit");
  //         fruitSliced.play();
  //         document.querySelector(".score span").innerText = score++;
  //       }
  //     }
  //   };

  if (hands.length) {
    let test = moveHands(hands, camera, fruitsObjects);

    if (test.includes(true)) {
      console.log("touched fruit");
      fruitSliced.play();
      document.querySelector(".score span").innerText = score++;
    }
  }

  render();
};

window.addEventListener("resize", onWindowResize, false);

document.getElementsByTagName("button")[0].onclick = () => {
  if (net) {
    document.getElementsByClassName("intro")[0].style.display = "none";
    generateFruits();
    detectPoseInRealTime(video, net);

    animate();
  }
};

const updateTrailTarget = (function updateTrailTarget() {
  var tempRotationMatrix = new THREE.Matrix4();
  var tempTranslationMatrix = new THREE.Matrix4();

  return function updateTrailTarget(time) {
    if (time - lastTrailUpdateTime > 10) {
      trail.advance();
      lastTrailUpdateTime = time;
    } else {
      trail.updateHead();
    }

    tempRotationMatrix.identity();
    tempTranslationMatrix.identity();
  };
})();
