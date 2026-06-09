import { tns } from "tiny-slider";

var slider = tns({
    container: "#home-carousel",
    items: 7,
    controlsContainer: "#next-prev",
    nav: false,
    loop: true,
    edgePadding: 40,
    gutter: 3,
    responsive: {
        200: {
            items: 1,
        },
        500: {
            items: 2,
        },
        900: {
            items: 3,
        },
    },
});
