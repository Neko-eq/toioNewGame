// app.js

import * as Toio from '@toio/core';

let toioCube = null;
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

// Toio接続ボタンのイベントリスナー
connectButton.addEventListener('click', async () => {
    try {
        statusText.innerText = 'Toioに接続中...';
        toioCube = await Toio.connectToioCoreCube();
        statusText.innerText = 'Toioに接続しました！';
        connectButton.style.display = 'none'; // 接続ボタンを非表示に

        // Toioのモーションセンサーデータの購読を開始
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
    if (toioCube) {
        toioCube.onMotionId(motionData => {
            // motionData.roll と motionData.pitch が傾きデータ
            const roll = motionData.roll;
            const pitch = motionData.pitch;

            debugRoll.innerText = roll.toFixed(2);
            debugPitch.innerText = pitch.toFixed(2);

            // 傾き判定ロジックを呼び出す
            handleToioTilt(roll, pitch);
        });
        // モーションセンサーデータの購読を有効にする (重要！)
        toioCube.requestMotionSensor('on');
    }
}