import { tns } from 'tiny-slider';

var slider = tns({
	container: '#home-carousel',
	items: 12,
	controlsContainer: '#next-prev',
	navContainer: '#nav',
	loop: true,
	edgePadding: 35,
	gutter: 3,
	responsive: {
		50: {
			items: 1,
		},
		400: {
			items: 1,
		},
		900: {
			items: 2,
		},
	},
});

console.log(slider.getInfo().navItems);
