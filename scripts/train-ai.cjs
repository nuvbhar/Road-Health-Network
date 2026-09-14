const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const path = require("path");

const NUM_SAMPLES = 6000;
const WINDOW_SIZE = 20; // 20 frames = ~600ms of data at 30Hz

function generateData() {
  const xs = [];
  const ys = [];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const classId = i % 2;
    const window = new Array(WINDOW_SIZE).fill(1.0); // Baseline gravity (1g)

    if (classId === 0) {
      // CLASS 0: POTHOLE (Negative drop, then positive strike)
      for (let j = 0; j < WINDOW_SIZE; j++)
        window[j] += Math.random() * 0.2 - 0.1;

      const dropIdx = Math.floor(Math.random() * 4) + 4;
      const strikeIdx = dropIdx + Math.floor(Math.random() * 3) + 2;

      window[dropIdx] -= Math.random() * 2.0 + 1.0;
      window[strikeIdx] += Math.random() * 3.0 + 1.5;

      xs.push(window);
      ys.push([1, 0]);
    } else {
      // CLASS 1: ROUGH ROAD / NOISE
      for (let j = 0; j < WINDOW_SIZE; j++) {
        window[j] += Math.random() * 1.6 - 0.8;
      }
      xs.push(window);
      ys.push([0, 1]);
    }
  }

  // Shuffle data
  const indices = Array.from({ length: NUM_SAMPLES }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledXs = indices.map((i) => xs[i]);
  const shuffledYs = indices.map((i) => ys[i]);

  return {
    // Expand dimensions from [samples, 20] to [samples, 20, 1]
    inputs: tf.tensor2d(shuffledXs).expandDims(-1),
    labels: tf.tensor2d(shuffledYs),
  };
}

async function run() {
  console.log("Generating synthetic telemetry data (N=6000)...");
  const { inputs, labels } = generateData();

  console.log("Constructing 1D Convolutional Neural Network...");
  const model = tf.sequential();

  // Root Fix: Natively accept [sequence.length, 1] instead of relying on a Reshape layer
  model.add(
    tf.layers.conv1d({
      inputShape: [WINDOW_SIZE, 1],
      filters: 16,
      kernelSize: 3,
      activation: "relu",
    }),
  );
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({ units: 2, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.005),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  console.log("Training model on synthetic waveforms...");
  await model.fit(inputs, labels, {
    epochs: 15,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}/15: loss = ${logs.loss.toFixed(4)}, val_acc = ${(logs.val_acc * 100).toFixed(1)}%`,
        );
      },
    },
  });

  const saveDir = path.resolve(__dirname, "../public/model");
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  console.log(`\nSaving trained model weights to ${saveDir}...`);

  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      fs.writeFileSync(
        path.join(saveDir, "model.json"),
        JSON.stringify({
          format: "layers-model",
          generatedBy: "TensorFlow.js tfjs-layers",
          convertedBy: null,
          modelTopology: artifacts.modelTopology,
          weightsManifest: [
            {
              paths: ["weights.bin"],
              weights: artifacts.weightSpecs,
            },
          ],
        }),
      );
      fs.writeFileSync(
        path.join(saveDir, "weights.bin"),
        Buffer.from(artifacts.weightData),
      );
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
        },
      };
    }),
  );

  console.log("Done! AI Model is ready for production.");
}

run();
