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
	"珂珂，端午安康 🎋\n\n" +
	"今天包了粽子\n" +
	"突然就很想你\n\n" +
	"想和你一起\n" +
	"看龙舟、吃粽子\n" +
	"过很多很多个端午\n\n" +
	"愿你一切都好\n" +
	"健健康康，平平安安\n\n" +
	"我会一直在的 ❤";

function startTypewriter(onComplete) {
	const twPage = document.getElementById("typewriter");
	const twText = document.getElementById("twText");
	const twCursor = document.getElementById("twCursor");

	twPage.classList.add("active");

	let i = 0;
	const charDelay = 150;
	const punctDelay = 400;
	const punctuation = new Set(["，", "。", "！", "？", "、", "：", "；", "——"]);

	function typeNext() {
		if (i >= blessingText.length) {
			twCursor.style.display = "none";
			setTimeout(onComplete, 1500);
			return;
		}

		const ch = blessingText[i];
		twText.textContent += ch;
		i++;

		const delay = punctuation.has(ch) ? punctDelay : charDelay;
		setTimeout(typeNext, delay);
	}

	typeNext();
}

function launchSurprise() {
	const cover = document.getElementById("cover");
	const twPage = document.getElementById("typewriter");

	// 封面淡出
	cover.classList.add("fade-out");

	// 后台预加载音频
	const audioReady = soundManager.preload().catch(() => { });

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
