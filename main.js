let cube; // 接続されたtoioを保持

// toioに接続する
async function connectToCube() {
  try {
    cube = await P5tCube.connectNewP5tCube();
    cube.turnLightOn("blue");
    cube.playMelody([{note: 0x3C, duration: 30}]);
    alert("toioに接続できました！");
    console.log("接続成功:", cube);
  } catch (e) {
    alert("接続に失敗しました: " + e);
    console.error("接続エラー:", e);
  }
}

// 正解時：前進＋緑ライト＋音
function quizCorrect() {
  if (!cube) {
    alert("toioが接続されていません！");
    return;
  }
  cube.turnLightOn("green");
  cube.playMelody([
    {note: 0x3C, duration: 30},
    {note: 0x3E, duration: 30},
    {note: 0x40, duration: 30}
  ]);
  cube.move(100, 0, 300); // 前進
}

// 不正解時：後退＋赤ライト＋低音
function quizWrong() {
  if (!cube) {
    alert("toioが接続されていません！");
    return;
  }
  cube.turnLightOn("red");
  cube.playMelody([
    {note: 0x30, duration: 30},
    {note: 0x2E, duration: 30}
  ]);
  cube.move(-50, 0, 300); // 後退
}
