import type { AdConfig } from "../types/config";

// 这里只是配置广告内容，如果要开关请在sidebarConfig.ts中控制侧边栏组件的的启用组件即可

// 广告配置1 - 纯图片广告（无边距）【已关闭】
export const adConfig1: AdConfig = {
	image: {
		src: "", // 清空图片
		alt: "广告横幅",
		link: "#",
		external: true,
	},
	closable: false,
	displayCount: -1,
	padding: {
		all: "0",
	},
};

// 广告配置2 - 完整内容广告【已关闭】
export const adConfig2: AdConfig = {
	title: "", // 清空标题
	content: "", // 清空内容
	image: {
		src: "", // 清空图片
		alt: "支持博主",
		link: "about/",
		external: false,
	},
	link: {
		text: "", // 清空链接文字
		url: "about/",
		external: false,
	},
	closable: true,
	displayCount: -1,
	padding: {},
};