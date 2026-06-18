/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

"use strict";

function setLoadingStatus(status) {
	document.querySelector(".loading-init__status").textContent = status;
}

function applyStaticText() {
	if (appNodes.copyrightYear) {
		appNodes.copyrightYear.textContent = String(new Date().getFullYear());
	}
}

function populateAppControls() {
	populateControls(appNodes, shellNames, {
		shellSizeOptions: ['3"', '4"', '6"', '8"', '12"', '16"'].map((label, index) => ({
			value: String(index),
			label,
		})),
		qualityOptions: [
			{ label: "低", value: QUALITY_LOW },
			{ label: "正常", value: QUALITY_NORMAL },
			{ label: "高", value: QUALITY_HIGH },
		],
		skyLightingOptions: [
			{ label: "不", value: SKY_LIGHT_NONE },
			{ label: "暗", value: SKY_LIGHT_DIM },
			{ label: "正常", value: SKY_LIGHT_NORMAL },
		],
		scaleFactorOptions: appConfig.scaleFactorOptions.map((value) => ({
			value: value.toFixed(2),
			label: `${value * 100}%`,
		})),
	});
}

function init() {
	const loadingNode = document.querySelector(".loading-init");
	if (loadingNode) {
		loadingNode.remove();
	}

	appNodes.stageContainer.classList.remove("remove");
	populateAppControls();

	if (!shellTypes[store.state.config.shell]) {
		store.setState({
			config: {
				...store.state.config,
				shell: "Random",
			},
		});
	}

	togglePause(false);
	renderApp(store.state, appNodes);
	configDidUpdate();
	applyResolvedBackground();
	soundManager.tryAutoPlay();
}

function attachRuntimeBindings() {
	store.subscribe((state) => renderApp(state, appNodes));
	store.subscribe(handleStateChange);

	bindAppControls({
		nodes: appNodes,
		onConfigChange: updateConfig,
		onScaleFactorChange: handleResize,
		onToggleFullscreen: toggleFullscreen,
		onBackgroundApply: handleBackgroundApply,
		onBackgroundClear: handleBackgroundClear,
		onHelpOpen(helpTopic) {
			store.setState({ openHelpTopic: helpTopic });
		},
		onHelpClose() {
			store.setState({ openHelpTopic: null });
		},
	});

	mainStage.addEventListener("pointerstart", handlePointerStart);
	mainStage.addEventListener("pointerend", handlePointerEnd);
	mainStage.addEventListener("pointermove", handlePointerMove);
	mainStage.addEventListener("ticker", update);

	window.addEventListener("keydown", handleKeydown);
	window.addEventListener("resize", handleResize);

	if (!fullscreenEnabled()) {
		appNodes.fullscreenFormOption.classList.add("remove");
	}

	backgroundManager.setStatus("未设置自定义背景", "idle");
	handleResize();
}

applyStaticText();
attachRuntimeBindings();

// ====== 端午惊喜流程：封面 → 打字机 → 烟花 ======
const blessingText =
	"端午安康，我的珂珂 🎋\n\n" +
	"今天是端午节\n" +
	"想认真地对你说：\n\n" +
	"有你的每一天\n" +
	"都很快乐安心\n\n" +
	"愿你健健康康，岁岁平安\n" +
	"我会一直在你身边\n" +
	"陪你走过每一个节日\n\n"
	+ "端午快乐！";

// 打字机音效：白噪音 + 滤波器，模拟真实机械按键声
function createNoiseBuffer(ctx) {
	const bufferSize = ctx.sampleRate * 0.05; // 50ms
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	return buffer;
}

let _noiseBuffer = null;
function getNoiseBuffer(ctx) {
	if (!_noiseBuffer) {
		_noiseBuffer = createNoiseBuffer(ctx);
	}
	return _noiseBuffer;
}

function playTypeClick() {
	if (!soundManager.ctx || soundManager.ctx.state !== "running") {
		return;
	}

	const ctx = soundManager.ctx;
	const now = ctx.currentTime;

	// 白噪音源
	const noise = ctx.createBufferSource();
	noise.buffer = getNoiseBuffer(ctx);

	// 带通滤波 → 敲击质感
	const bandpass = ctx.createBiquadFilter();
	bandpass.type = "bandpass";
	bandpass.frequency.value = 2500 + Math.random() * 1500;
	bandpass.Q.value = 1.5;

	// 高通滤波 → 去掉低频闷声
	const highpass = ctx.createBiquadFilter();
	highpass.type = "highpass";
	highpass.frequency.value = 800;

	// 包络
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.15, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

	noise.connect(bandpass);
	bandpass.connect(highpass);
	highpass.connect(gain);
	gain.connect(ctx.destination);
	noise.start(now);
	noise.stop(now + 0.05);
}

function playTypeReturn() {
	if (!soundManager.ctx || soundManager.ctx.state !== "running") {
		return;
	}

	const ctx = soundManager.ctx;
	const now = ctx.currentTime;

	// 更重的机械声
	const noise = ctx.createBufferSource();
	noise.buffer = getNoiseBuffer(ctx);

	const bandpass = ctx.createBiquadFilter();
	bandpass.type = "bandpass";
	bandpass.frequency.value = 1200;
	bandpass.Q.value = 0.8;

	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.2, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

	noise.connect(bandpass);
	bandpass.connect(gain);
	gain.connect(ctx.destination);
	noise.start(now);
	noise.stop(now + 0.15);

	// 叮一声（行尾铃声）
	setTimeout(() => {
		const osc = ctx.createOscillator();
		const bellGain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = 2200;
		bellGain.gain.setValueAtTime(0.06, ctx.currentTime);
		bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
		osc.connect(bellGain);
		bellGain.connect(ctx.destination);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.3);
	}, 60);
}

function startTypewriter(onComplete) {
	const twPage = document.getElementById("typewriter");
	const twText = document.getElementById("twText");
	const twCursor = document.getElementById("twCursor");

	twPage.classList.add("active");

	let i = 0;
	const charDelay = 150;
	const punctDelay = 400;
	const punctuation = new Set(["，", "。", "！", "？", "、", "：", "；", "——"]);
	const newline = new Set(["\n"]);

	function typeNext() {
		if (i >= blessingText.length) {
			twCursor.style.display = "none";
			setTimeout(onComplete, 1500);
			return;
		}

		const ch = blessingText[i];
		twText.textContent += ch;
		i++;

		// 播放音效
		if (newline.has(ch)) {
			playTypeReturn();
		} else if (ch.trim()) {
			playTypeClick();
		}

		const delay = punctuation.has(ch) ? punctDelay : newline.has(ch) ? punctDelay : charDelay;
		setTimeout(typeNext, delay);
	}

	typeNext();
}

function launchSurprise() {
	const cover = document.getElementById("cover");
	const twPage = document.getElementById("typewriter");

	// 立即注册用户交互（浏览器要求用户手势才能播放音频）
	soundManager.registerInteraction();

	// 封面淡出
	cover.classList.add("fade-out");

	// 后台预加载音频，完成后解码
	const audioReady = soundManager.preload().then(() => soundManager.decodeReady()).catch(() => { });

	// 封面淡出后启动打字机
	setTimeout(() => {
		cover.style.display = "none";

		startTypewriter(() => {
			// 打字完成 → 淡出打字机，启动烟花
			twPage.classList.add("fade-out");

			audioReady.finally(() => {
				init();
				// 确保自动发射开启
				if (!store.state.config.autoLaunch) {
					updateConfig({ autoLaunch: true });
				}
			});

			setTimeout(() => {
				twPage.style.display = "none";
			}, 800);
		});
	}, 800);
}

// 绑定封面按钮
document.getElementById("startBtn").addEventListener("click", launchSurprise);

if (IS_HEADER) {
	// Header 模式直接启动，跳过封面
	document.getElementById("cover").style.display = "none";
	document.getElementById("typewriter").style.display = "none";
	init();
}
