import axios from 'axios';

const searchForm = document.getElementById('search-form');
const searchButton = document.getElementById('submit');
const urlParams = new URLSearchParams(window.location.search);
const qry = urlParams.get('qry');
if (qry) {
	console.log('Value received:', qry);

	qryElem = document.getElementById('qry');
	qryElem.value = qry;

	// searchButton.click();
}

window.onTurnstileSuccess = function onTurnstileSuccess(token) {
	console.log('Callback called:', token);
	searchButton.disabled = false;
};

searchForm.addEventListener('submit', function (event) {
	event.preventDefault();

	const qry = document.getElementById('qry').value;
	if (!qry) {
		alert('Please ensure a query string is provided');
		return;
	}

	const token = document.getElementsByName('cf-turnstile-response').value;
	doSearch(token, qry);
	return;

	/*
    async function sendData() {
        try {
            const response = await fetch("https://example.org/post", {
                method: "POST",
                body: formData,
            });
            console.log(await response.json());
        } catch (e) {
            console.error(e);
        }
    }
    sendData();
    */
});

function doSearch(token, term) {
	// hideError();
	// showLoading();

	const API_ENDPOINT = 'https://z0njtycwm6.execute-api.ap-south-1.amazonaws.com/prod';
	const API_KEY = 'qkIQ6276FyaRzBlhxM3kN8BGd22TWNyN9LNK7qSC';
	fetch(API_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': API_KEY,
		},
		body: JSON.stringify({
			token: token,
			query: term,
			minScore: 0,
			page: 1,
		}),
	})
		.then(function (response) {
			if (!response.ok) {
				return response.json().then(function (err) {
					throw new Error(err.error || 'Search failed. Please try again.');
				});
			}
			return response.json();
		})
		.then(function (hits) {
			renderResults(hits, term, minScore, page);
		})
		.catch(function (err) {
			// hideLoading();
			// showError(err.message || 'An unexpected error occurred.');
			console.log(err.message || 'An unexpected error occurred.');
		});
}
