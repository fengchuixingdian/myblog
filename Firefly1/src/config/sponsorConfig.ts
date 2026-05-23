import type { SponsorConfig } from "../types/config";

export const sponsorConfig: SponsorConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 赞助用途说明
	
	// 是否显示赞助者列表
	showSponsorsList: false,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: false,

	// 是否在文章详情页底部显示赞助按钮
	showButtonInPost: false,

	// 赞助方式列表
	methods: [
		
	],

	// 赞助者列表（可选）
	sponsors: [
		
	],
};
