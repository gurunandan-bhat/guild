import Handlebars from 'handlebars';

// -----------------------------------------------
// Configuration — update these values
// -----------------------------------------------
const API_ENDPOINT = 'https://YOUR_API_GATEWAY_URL/prod/search';
const API_KEY = 'YOUR_API_GATEWAY_KEY';

// -----------------------------------------------
// State
// -----------------------------------------------
let currentTerm = '';
let currentMinScore = 0;
let currentPage = 0;

// -----------------------------------------------
// Handlebars helper — gt (greater than)
// -----------------------------------------------
Handlebars.registerHelper('gt', function (a, b) {
	return a > b;
});

// -----------------------------------------------
// Compile Handlebars templates
// -----------------------------------------------
const resultTemplate = Handlebars.compile(document.getElementById('result-item-template').innerHTML);
const navigatorTemplate = Handlebars.compile(document.getElementById('page-navigator-template').innerHTML);

// -----------------------------------------------
// Form submit handler
// -----------------------------------------------
const searchForm = document.getElementById('search-form');
if (searchForm) {
	searchForm.addEventListener('submit', function (e) {
		e.preventDefault();

		const token = document.querySelector('[name="cf-turnstile-response"]').value;
		if (!token) {
			showError('Please complete the security check before searching.');
			return;
		}

		currentTerm = document.querySelector('[name="qry"]').value.trim();
		currentMinScore = parseInt(document.querySelector('[name="min-score"]').value || '0', 10);
		currentPage = 0;

		if (!currentTerm) {
			showError('Please enter a search term.');
			return;
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

	const token = document.querySelector('[name="cf-turnstile-response"]').value;
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
		.then(function (hits) {
			renderResults(hits, term, minScore, page);
		})
		.catch(function (err) {
			hideLoading();
			showError(err.message || 'An unexpected error occurred.');
		});
}

// -----------------------------------------------
// Render results and pagination
// -----------------------------------------------
function renderResults(hits, term, minScore, page) {
	hideLoading();

	if (!hits || hits.length === 0) {
		document.getElementById('search-results-container').style.display = 'block';
		document.getElementById('search-results').innerHTML =
			'<p class="text-center text-muted mt-4">No results found for <strong>' +
			escapeHtml(term) +
			'</strong>.</p>';
		document.getElementById('page-navigator-top').innerHTML = '';
		document.getElementById('page-navigator-bottom').innerHTML = '';
		return;
	}

	const totalPages = hits.totalPages || 1;
	const navContext = buildNavContext(page, totalPages, term, minScore);

	document.getElementById('search-results').innerHTML = resultTemplate({ hits: hits });

	const navHtml = navigatorTemplate(navContext);
	document.getElementById('page-navigator-top').innerHTML = navHtml;
	document.getElementById('page-navigator-bottom').innerHTML = navHtml;

	document.getElementById('search-results-container').style.display = 'block';
}

// -----------------------------------------------
// Build pagination context for Handlebars
// -----------------------------------------------
function buildNavContext(page, totalPages, term, minScore) {
	const pageNumbers = [];
	for (let i = 0; i < totalPages; i++) {
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
		term: term,
		minScore: minScore,
	};
}

// -----------------------------------------------
// UI helpers
// -----------------------------------------------
function showLoading() {
	const container = document.getElementById('search-results-container');
	container.style.display = 'block';
	document.getElementById('search-results').innerHTML =
		'<div class="search-loading"><div class="spinner-border text-danger" role="status">' +
		'<span class="visually-hidden">Searching...</span></div>' +
		'<p class="mt-2">Searching...</p></div>';
	document.getElementById('page-navigator-top').innerHTML = '';
	document.getElementById('page-navigator-bottom').innerHTML = '';
}

function hideLoading() {
	// Loading state is replaced by renderResults or showError
}

function showError(message) {
	document.getElementById('search-error-message').textContent = message;
	document.getElementById('search-error').style.display = 'block';
}

function hideError() {
	document.getElementById('search-error').style.display = 'none';
}

function escapeHtml(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
