import './search-results.js';
import * as params from '@params';

// -----------------------------------------------
// Constants
// -----------------------------------------------
const API_ENDPOINT = params.searchEndpoint;
const API_KEY = params.apiKey;

// -----------------------------------------------
// State
// -----------------------------------------------
let currentTerm = '';
let currentMinScore = 0;
let currentPage = 0;

// -----------------------------------------------
// Turnstile callbacks
// -----------------------------------------------
window.onTurnstileSuccess = function (token) {
	// Auto-trigger search if page loaded with ?qry= param
	console.log('Token avaiable:', token);
	// const qryElem = document.getElementById('qry');
	// if (qryElem && qryElem.value) {
	// 	doSearch(token, qryElem.value, currentMinScore, currentPage);
	// }
};

window.onTurnstileError = function (err) {
	showError('Security check failed. Please refresh and try again.');
	console.error('Turnstile error:', err);
};

// -----------------------------------------------
// Pre-populate query from URL params
// -----------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const urlQry = urlParams.get('qry');
if (urlQry) {
	const qryElem = document.getElementById('qry');
	if (qryElem) {
		qryElem.value = urlQry;
	}
	const token = window.turnstile.getResponse();
	doSearch(token, urlQry, currentMinScore, currentPage);
}

// -----------------------------------------------
// Form submit handler
// -----------------------------------------------
const searchForm = document.getElementById('search-form');
if (searchForm) {
	searchForm.addEventListener('submit', function (event) {
		event.preventDefault();

		const qryElem = document.getElementById('qry');
		const term = qryElem ? qryElem.value.trim() : '';
		if (!term) {
			showError('Please enter a search term.');
			return;
		}

		currentTerm = term;
		currentMinScore = 0;
		currentPage = 0;

		const token = window.turnstile.getResponse();
		if (!token) {
			console.log('No token available');
		}
		doSearch(token, currentTerm, currentMinScore, currentPage);
	});
}

// -----------------------------------------------
// Pagination click handler
// -----------------------------------------------
document.addEventListener('click', function (e) {
	const link = e.target.closest('[data-goto-page]');
	if (!link) return;

	e.preventDefault();

	const parentItem = link.closest('.page-item');
	if (parentItem && parentItem.classList.contains('disabled')) return;

	const page = parseInt(link.getAttribute('data-goto-page'), 10);
	if (isNaN(page)) return;

	currentPage = page;

	const token = window.turnstile.getResponse();
	doSearch(token, currentTerm, currentMinScore, currentPage);
	window.scrollTo({ top: 0, behavior: 'smooth' });
});

// -----------------------------------------------
// Core search function
// -----------------------------------------------
function doSearch(token, term, minScore, page) {
	hideError();
	showLoading();

	fetch(API_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': API_KEY,
		},
		body: JSON.stringify({
			token: token,
			query: term,
			minScore: minScore,
			page: page,
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
		.then(function (response) {
			renderResults(response, term, minScore, page);
		})
		.catch(function (err) {
			hideLoading();
			console.log('Error from doSearch:', err);
			showError(err.message || 'An unexpected error occurred.');
		})
		.finally(function () {
			console.log('Request completed');
			window.turnstile.reset();
		});
}

// -----------------------------------------------
// Render results and pagination
// -----------------------------------------------
function renderResults(response, term, minScore, page) {
	hideLoading();

	const resultsTemplate = Handlebars.templates['search-results'];
	const paginationTemplate = Handlebars.templates['pagination'];

	if (!response.hits || response.hits.length === 0) {
		document.getElementById('output').innerHTML =
			'<p class="text-center text-muted mt-4">No results found for <strong>' +
			escapeHtml(term) +
			'</strong>.</p>';
		return;
	}

	// Replace plain field values with Algolia highlighted versions
	// where the field was matched by the search query
	response.hits = response.hits.map(function (hit) {
		if (hit._highlightResult) {
			for (const [key, val] of Object.entries(hit._highlightResult)) {
				if (val.matchLevel && val.matchLevel !== 'none') {
					hit[key] = val.value;
				}
			}
		}
		return hit;
	});

	const navContext = buildNavContext(page, response.pages);
	const navHtml = response.pages > 1 ? paginationTemplate(navContext) : '';

	document.getElementById('output').innerHTML = navHtml + resultsTemplate(response) + navHtml;
}

// -----------------------------------------------
// Build pagination context for Handlebars
// -----------------------------------------------
function buildNavContext(page, totalPages) {
	const slots = 5;

	let start = Math.max(0, page - Math.floor(slots / 2));
	let end = Math.min(totalPages - 1, start + slots - 1);

	if (end - start + 1 < slots) {
		start = Math.max(0, end - slots + 1);
	}

	const pageNumbers = [];
	for (let i = start; i <= end; i++) {
		pageNumbers.push({
			index: i,
			label: i + 1,
			isActive: i === page,
		});
	}

	return {
		currentPage: page + 1,
		totalPages: totalPages,
		isFirstPage: page === 0,
		isLastPage: page === totalPages - 1,
		prevPage: page - 1,
		nextPage: page + 1,
		pageNumbers: pageNumbers,
	};
}

// -----------------------------------------------
// UI helpers
// -----------------------------------------------
function showLoading() {
	document.getElementById('output').innerHTML =
		'<div class="text-center mt-4">' +
		'<div class="spinner-border text-danger" role="status">' +
		'<span class="visually-hidden">Searching...</span>' +
		'</div>' +
		'<p class="mt-2 text-muted">Searching...</p>' +
		'</div>';
}

function hideLoading() {
	// Replaced by renderResults or showError
}

function showError(message) {
	document.getElementById('output').innerHTML =
		'<div class="alert alert-danger mt-4" role="alert">' + escapeHtml(message) + '</div>';
}

function hideError() {
	// Cleared by showLoading at the start of each search
}

function escapeHtml(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
