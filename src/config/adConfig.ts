import type { AdConfig } from "../types/config";

export const adConfig1: AdConfig = {
	image: {
		src: "",
		alt: "",
		link: "#",
		external: false,
	},
	closable: true,
	displayCount: -1,
	padding: {
		all: "0",
	},
};

export const adConfig2: AdConfig = {
	title: "",
	content: "",
	image: {
		src: "",
		alt: "",
		link: "",
		external: false,
	},
	link: {
		text: "",
		url: "",
		external: false,
	},
	closable: true,
	displayCount: -1,
	padding: {},
};