// main.js

let p5tCube = null; // 接続されたToioキューブのインスタンス
let currentQuestionIndex = 0;
let quizQuestions = [
    {
        question: "日本の首都はどこ？",
        choices: {
            topLeft: "大阪",
            topRight: "東京",
            bottomLeft: "福岡",
            bottomRight: "札幌"
        },
        correctDirection: "topRight" // 正解の方向
    },
    {
        question: "世界で一番高い山は？",
        choices: {
            topLeft: "K2",
            topRight: "マッターホルン",
            bottomLeft: "モンブラン",
            bottomRight: "エベレスト"
        },
        correctDirection: "bottomRight"
    },
    {
        question: "太陽系の惑星で一番大きいのは？",
        choices: {
            topLeft: "地球",
            topRight: "木星",
            bottomLeft: "火星",
            bottomRight: "土星"
        },
        correctDirection: "topRight"
    }
];

// UI要素の取得
const connectButton = document.getElementById('connectButton');
const statusText = document.getElementById('status');
const quizArea = document.getElementById('quizArea');
const questionText = document.getElementById('question');
const choiceTopLeft = document.getElementById('choice-topLeft');
const choiceTopRight = document.getElementById('choice-topRight');
const choiceBottomLeft = document.getElementById('choice-bottomLeft');
const choiceBottomRight = document.getElementById('choice-bottomRight');
const resultText = document.getElementById('result');
const debugRoll = document.getElementById('debugRoll');
const debugPitch = document.getElementById('debugPitch');
const debugSelectedDirection = document.getElementById('debugSelectedDirection');

// 選択中の選択肢を保持する変数
let selectedDirection = null;
let selectionTimer = null; // 選択確定用のタイマー
const SELECTION_CONFIRM_TIME = 1000; // 選択確定までの時間 (ms)
let isProcessingSelection = false; // 選択処理中フラグ

// 傾き判定の閾値
const TILT_THRESHOLD = 20; // デグリー単位。この値を超えて傾いたと判断する閾値。

// --- p5.js と p5.toio の設定 ---

// p5.js のセットアップ関数 (初回一度だけ実行される)
function setup() {
    // createCanvas はHTMLキャンバスを生成しますが、今回は表示用ではないので最小サイズに
    createCanvas(1, 1).parent(document.body); // <body>の子要素として作成
    noCanvas(); // キャンバスは非表示に
}

// p5.js のドロー関数 (毎フレーム実行されるが、今回は使わない)
function draw() {
    // 描画処理は行わない
}

// Toio接続ボタンのイベントリスナー
connectButton.addEventListener('click', async () => {
    try {
        statusText.innerText = 'Toioに接続中...';
        // P5tCube.connectNewP5tCube() でToioに接続
        p5tCube = await P5tCube.connectNewP5tCube();
        statusText.innerText = 'Toioに接続しました！';
        connectButton.style.display = 'none'; // 接続ボタンを非表示に

        // Toioのモーションセンサーイベントを購読
        startToioMotionSensor();

        // 最初のクイズを表示
        displayQuestion(currentQuestionIndex);
        quizArea.style.display = 'block'; // クイズエリアを表示
    } catch (error) {
        console.error('Toio接続エラー:', error);
        statusText.innerText = `接続エラー: ${error.message}`;
    }
});

// Toioのモーションセンサーデータ購読を開始する関数
function startToioMotionSensor() {
    if (p5tCube) {
        // p5.toio では 'sensor:motion' イベントでモーションデータを取得
        p5tCube.on("sensor:motion", (data) => {
            // data オブジェクトに roll, pitch, yaw などが含まれるはずです
            // p5.toioのバージョンやToioのファームウェアによってデータ形式が異なる可能性があるので
            // ログで一度確認するのが安全です
            // console.log("Motion Data:", data);

            const roll = data.roll;
            const pitch = data.pitch;

            debugRoll.innerText = roll.toFixed(2);
            debugPitch.innerText = pitch.toFixed(2);

            // 傾き判定ロジックを呼び出す
            handleToioTilt(roll, pitch);
        });
        // 必要に応じて、Toio側でモーションセンサーを有効にするコマンドを送る（p5.toioでは自動的に行われる場合が多い）
    }
}

// 傾き判定ロジック
function handleToioTilt(roll, pitch) {
    if (isProcessingSelection) return; // 選択処理中は新たな傾きを無視

    let currentDetectedDirection = null;

    // Toioの姿勢角の取り方によって、正負の判定が変わる可能性があります。
    // 手前に傾けるとpitchが正、奥に傾けると負。
    // 右に傾けるとrollが正、左に傾けると負。
    // 以下は一般的な想定での閾値判定です。実機で確認しながら調整してください。

    // 斜め方向の判定（4方向の選択肢に対応）
    // 例えば、左上は「奥に傾けつつ左に傾ける」
    // Toioのロゴを上にして水平に置いた状態を基準（roll, pitchが0付近）とします。
    // 奥に傾ける = pitch が正の値に（Toioを自分から遠ざけるように傾ける）
    // 手前に傾ける = pitch が負の値に（Toioを自分に近づけるように傾ける）
    // 右に傾ける = roll が正の値に
    // 左に傾ける = roll が負の値に

    // どの方向に傾いているかを判定
    if (pitch > TILS_THRESHOLD && roll < -TILT_THRESHOLD) { // 奥（上）に傾けつつ、左に傾ける
        currentDetectedDirection = "topLeft";
    } else if (pitch > TILT_THRESHOLD && roll > TILT_THRESHOLD) { // 奥（上）に傾けつつ、右に傾ける
        currentDetectedDirection = "topRight";
    } else if (pitch < -TILT_THRESHOLD && roll < -TILT_THRESHOLD) { // 手前（下）に傾けつつ、左に傾ける
        currentDetectedDirection = "bottomLeft";
    } else if (pitch < -TILT_THRESHOLD && roll > TILT_THRESHOLD) { // 手前（下）に傾けつつ、右に傾ける
        currentDetectedDirection = "bottomRight";
    }

    debugSelectedDirection.innerText = currentDetectedDirection || "None";

    // 選択肢のハイライトを更新
    highlightChoice(currentDetectedDirection);

    // 選択確定ロジック
    if (currentDetectedDirection && currentDetectedDirection !== selectedDirection) {
        // 新しい選択肢に傾いた場合、タイマーをリセットして再開
        clearTimeout(selectionTimer);
        selectedDirection = currentDetectedDirection;
        selectionTimer = setTimeout(() => {
            // 一定時間傾きが保持されたら選択確定
            processSelection(selectedDirection);
        }, SELECTION_CONFIRM_TIME);
    } else if (!currentDetectedDirection && selectedDirection) {
        // どこにも傾いていない状態に戻ったら、選択をリセット
        clearTimeout(selectionTimer);
        selectedDirection = null;
        debugSelectedDirection.innerText = "None"; // デバッグ表示もリセット
    }
}

// 選択肢のハイライトを更新する関数
function highlightChoice(direction) {
    // 全ての選択肢のハイライトを解除
    [choiceTopLeft, choiceTopRight, choiceBottomLeft, choiceBottomRight].forEach(el => {
        el.classList.remove('highlighted');
    });

    // 選択された方向の選択肢をハイライト
    if (direction) {
        document.getElementById(`choice-${direction}`).classList.add('highlighted');
    }
}

// クイズの問題を表示する関数
function displayQuestion(index) {
    if (index >= quizQuestions.length) {
        questionText.innerText = "すべての問題が終了しました！";
        resultText.innerText = "お疲れ様でした！";
        // Toioのモーションセンサーデータの購読を停止 (p5.toioでは明示的な停止APIがない場合がある)
        // もし必要なら p5tCube.on("sensor:motion", null); のようにイベントリスナーを解除する
        if (p5tCube) {
            p5tCube.turnOffLight(); // LEDを消す
        }
        return;
    }

    const currentQuiz = quizQuestions[index];
    questionText.innerText = `問題 ${index + 1}: ${currentQuiz.question}`;

    // 選択肢のテキストを更新
    choiceTopLeft.innerText = currentQuiz.choices.topLeft;
    choiceTopRight.innerText = currentQuiz.choices.topRight;
    choiceBottomLeft.innerText = currentQuiz.choices.bottomLeft;
    choiceBottomRight.innerText = currentQuiz.choices.bottomRight;

    // 前回の正誤表示とハイライトをリセット
    resultText.innerText = "";
    [choiceTopLeft, choiceTopRight, choiceBottomLeft, choiceBottomRight].forEach(el => {
        el.classList.remove('correct', 'incorrect', 'highlighted');
    });

    isProcessingSelection = false; // 新しい問題が始まったら選択処理を許可
}

// 選択が確定した後の処理
async function processSelection(selected) {
    if (isProcessingSelection) return; // 二重処理防止
    isProcessingSelection = true; // 処理中フラグを立てる

    const currentQuiz = quizQuestions[currentQuestionIndex];
    let correctChoiceElement = document.getElementById(`choice-${currentQuiz.correctDirection}`);
    let selectedChoiceElement = document.getElementById(`choice-${selected}`);

    if (selected === currentQuiz.correctDirection) {
        resultText.innerText = "正解！";
        selectedChoiceElement.classList.add('correct');
        // Toioを緑色に光らせる
        if (p5tCube) {
            await p5tCube.turnLightOn("green");
        }
    } else {
        resultText.innerText = "不正解...";
        selectedChoiceElement.classList.add('incorrect');
        correctChoiceElement.classList.add('correct'); // 正解の選択肢も表示
        // Toioを赤色に光らせる
        if (p5tCube) {
            await p5tCube.turnLightOn("red");
        }
    }

    // 次の問題へ進むための待機
    setTimeout(async () => {
        currentQuestionIndex++;
        displayQuestion(currentQuestionIndex);
        // ToioのLEDを消す
        if (p5tCube) {
            await p5tCube.turnOffLight();
        }
        selectedDirection = null; // 選択状態をリセット
        highlightChoice(null); // ハイライトも解除
    }, 2000); // 2秒後に次の問題へ
}