import { tns } from 'tiny-slider';

var slider = tns({
	container: '#home-carousel',
	items: 2,
	controlsContainer: '#next-prev',
	nav: false,
	loop: true,
	edgePadding: 50,
	responsive: {
		768: {
			items: 3,
		},
		992: {
			items: 4,
		},
		1200: {
			items: 5,
		},
	},
});

console.log(slider.getInfo().navItems);
