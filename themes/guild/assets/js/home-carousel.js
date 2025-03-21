import { tns } from 'tiny-slider';

var slider = tns({
	container: '#home-carousel',
	items: 6,
	controlsContainer: '#next-prev',
	loop: true,
	edgePadding: 40,
	gutter: 5,
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
