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

// --- p5.js の設定 ---

// p5.js のセットアップ関数 (初回一度だけ実行される)
function setup() {
    // p5.js の描画キャンバスを生成しますが、今回は表示用ではないので最小サイズに設定し、非表示にします。
    // HTMLキャンバスが<body>の子要素として作成されるようにします。
    createCanvas(1, 1).parent(document.body);
    noCanvas(); // キャンバスは非表示に
}

// p5.js のドロー関数 (毎フレーム実行されるが、今回は直接センサーポーリングには使わない)
function draw() {
    // 描画処理や、直接的なセンサーポーリングは行わない。
    // センサーデータはイベントリスナーで取得します。
}

// Toio接続ボタンのイベントリスナー
connectButton.addEventListener('click', async () => {
    try {
        statusText.innerText = 'Toioに接続中...';
        // P5tCube.connectNewP5tCube() でToioに接続
        p5tCube = await P5tCube.connectNewP5tCube();
        statusText.innerText = 'Toioに接続しました！';
        connectButton.style.display = 'none'; // 接続ボタンを非表示に

        // Toioのモーションセンサーイベントの購読を開始
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
            // ここで、受け取った 'data' オブジェクトの中身をコンソールで確認することが非常に重要です！
            // data.roll と data.pitch が存在しない場合、以下の行を修正する必要があります。
            console.log("Motion Data:", data); // ★この行のコンソールログでデータ構造を確認してください★

            // 仮に data.roll と data.pitch が直接存在すると仮定します。
            // もし data.attitude.roll など、異なるパスにある場合はここを修正してください。
            const roll = data.roll;
            const pitch = data.pitch;

            // デバッグ表示の更新
            debugRoll.innerText = roll !== undefined && roll !== null ? roll.toFixed(2) : "N/A";
            debugPitch.innerText = pitch !== undefined && pitch !== null ? pitch.toFixed(2) : "N/A";

            // 傾き判定ロジックを呼び出す
            handleToioTilt(roll, pitch);
        });
        // p5.toio は通常、接続時に自動でセンサーデータを送る設定になっていることが多いですが、
        // もし必要なら明示的なセンサーONのAPIがあればここに記述。
        // 現時点では、p5.toio v0.8.0の一般的な使用法では不要のはずです。
    }
}

// 傾き判定ロジック
function handleToioTilt(roll, pitch) {
    // roll または pitch が undefined/null の場合は処理しない（データがまだ来ていない可能性）
    if (roll === undefined || roll === null || pitch === undefined || pitch === null) {
        return;
    }

    if (isProcessingSelection) return; // 選択処理中は新たな傾きを無視

    let currentDetectedDirection = null;

    // Toioの姿勢角の取り方によって、正負の判定が変わる可能性があります。
    // Toioのロゴが上を向いて水平に置かれた状態を基準（roll, pitchが0付近）とします。
    // 一般的な想定:
    // 奥に傾ける = pitch が正の値に（Toioを自分から遠ざけるように傾ける）
    // 手前に傾ける = pitch が負の値に（Toioを自分に近づけるように傾ける）
    // 右に傾ける = roll が正の値に
    // 左に傾ける = roll が負の値に

    // どの方向に傾いているかを判定 (斜め4方向)
    if (pitch > TILT_THRESHOLD && roll < -TILT_THRESHOLD) { // 奥（上）に傾けつつ、左に傾ける
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
        // ToioのLEDを消す
        if (p5tCube) {
            p5tCube.turnOffLight();
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