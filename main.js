// main.js

// Toioのモーションセンサーデータ購読を開始する関数
function startToioMotionSensor() {
    if (p5tCube) {
        // --- ★ここを修正します★ ---
        // p5.toio のセンサーデータは、P5tCubeインスタンスのプロパティとして直接アクセスするか、
        // あるいは `addEventListener` を使用します。
        // ここでは、p5.jsの draw() ループを利用して定期的にデータを参照する形に修正します。

        // p5.js の setup 関数内でループ処理を開始しているはずなので、
        // draw() 関数内で p5tCube.roll や p5tCube.pitch を参照するのが一般的な使い方です。

        // 一旦、p5.js の draw ループと連携させる形にします。

        // p5.js の setup() 関数内で toio を初期化し、
        // draw() 関数内で toio のセンサーデータを参照するように変更します。

        // 新しいToio接続時に、センサーデータのポーリングを開始するためのフラグを設定
        g_isToioConnected = true;

        console.log("Toioのモーションセンサーデータの監視を開始しました。");
    }
}


// --- 新たに追加・修正する部分 ---

// p5.js のセットアップ関数 (初回一度だけ実行される)
// この関数内で Toio 接続処理は行わず、UIの初期化だけを行う
function setup() {
    createCanvas(1, 1).parent(document.body);
    noCanvas();
    // ここではToio接続は行わない。ボタンクリック時に接続する
}

// グローバル変数として、Toioが接続されたかどうかのフラグと、現在の傾きデータを保持
let g_isToioConnected = false;
let g_currentRoll = 0;
let g_currentPitch = 0;


// p5.js のドロー関数 (毎フレーム実行される)
// ここでToioのセンサーデータをポーリングします
function draw() {
    if (g_isToioConnected && p5tCube && p5tCube.isConnected()) {
        // p5tCube の sensor オブジェクトから直接 roll と pitch を取得
        // (p5.toio のバージョンによってパスが異なる可能性があるので、コンソールログで確認推奨)
        // 例えば、p5tCube.motion.roll のような形かもしれません。
        // 公式ドキュメントの記載例では `cube.roll` `cube.pitch` のように直接プロパティアクセスも可能なようです
        const roll = p5tCube.roll;
        const pitch = p5tCube.pitch;

        // デバッグ表示の更新
        debugRoll.innerText = roll ? roll.toFixed(2) : "N/A";
        debugPitch.innerText = pitch ? pitch.toFixed(2) : "N/A";

        // 傾き判定ロジックを呼び出す
        handleToioTilt(roll, pitch);

        // 前回と値が変わった時だけ更新したい場合は、ここで古い値と現在の値を比較する
        // g_currentRoll = roll;
        // g_currentPitch = pitch;
    }
}

// handleToioTilt 関数はそのまま利用

// connectButton.addEventListener の中も一部変更
connectButton.addEventListener('click', async () => {
    try {
        statusText.innerText = 'Toioに接続中...';
        p5tCube = await P5tCube.connectNewP5tCube();
        statusText.innerText = 'Toioに接続しました！';
        connectButton.style.display = 'none';

        // 接続成功したら、p5.js の draw ループ内でセンサーデータを監視するフラグを立てる
        g_isToioConnected = true; // このフラグを立てることで draw 関数内でセンサー監視が開始されます

        // 最初のクイズを表示
        displayQuestion(currentQuestionIndex);
        quizArea.style.display = 'block';
    } catch (error) {
        console.error('Toio接続エラー:', error);
        statusText.innerText = `接続エラー: ${error.message}`;
    }
});


// ... 以下のクイズロジックは変更なし ...

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