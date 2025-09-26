function waitForMsgType(target, type) {
  return new Promise((resolve) => {
    target.addEventListener("message", function onMsg({ data }) {
      if ((data == null ? void 0 : data.type) !== type) return;
      target.removeEventListener("message", onMsg);
      resolve(data);
    });
  });
}
waitForMsgType(self, "wasm_bindgen_worker_init").then(async ({ init, receiver }) => {
  const pkg = await import("./gslib-Z116Xut7.js");
  await pkg.default(init);
  postMessage({ type: "wasm_bindgen_worker_ready" });
  pkg.wbg_rayon_start_worker(receiver);
});
async function startWorkers(module, memory, builder) {
  if (builder.numThreads() === 0) {
    throw new Error(`num_threads must be > 0.`);
  }
  const workerInit = {
    type: "wasm_bindgen_worker_init",
    init: { module_or_path: module, memory },
    receiver: builder.receiver()
  };
  await Promise.all(
    Array.from({ length: builder.numThreads() }, async () => {
      const worker = new Worker(self.location.href, {
        type: "module"
      });
      worker.postMessage(workerInit);
      await waitForMsgType(worker, "wasm_bindgen_worker_ready");
      return worker;
    })
  );
  builder.build();
}
export {
  startWorkers as s
};
