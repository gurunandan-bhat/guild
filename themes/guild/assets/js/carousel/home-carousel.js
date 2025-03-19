import { tns } from './src/tiny-slider.js';

var slider = tns({
	items: 2,
	controls: false,
	responsive: {
		350: {
			items: 3,
			controls: true,
			edgePadding: 30,
		},
		500: {
			items: 4,
		},
	},
	container: '#responsive',
	swipeAngle: false,
	speed: 400,
});
