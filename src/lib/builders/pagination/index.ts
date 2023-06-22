import { elementDerived, elementMultiDerived, kbd, omit } from '$lib/internal/helpers';
import type { Defaults } from '$lib/internal/types';
import { derived, writable } from 'svelte/store';
import { getPageItems, type Page } from './helpers';

export type CreatePaginationArgs = {
	/** Number of total items */
	count: number;
	/** Number of items per page */
	perPage?: number;
	/** Number of visible items before and after the current page */
	siblingCount?: number;
	/** Current page */
	page?: number;
};

const defaults = {
	perPage: 1,
	siblingCount: 1,
	page: 1,
} satisfies Defaults<CreatePaginationArgs>;

export function createPagination(args: CreatePaginationArgs) {
	const withDefaults = { ...defaults, ...args };
	const options = writable(omit(withDefaults, 'page'));
	const page = writable(withDefaults.page);

	const totalPages = derived([options], ([$options]) => {
		return Math.ceil($options.count / $options.perPage);
	});

	const range = derived([page, options], ([$page, $options]) => {
		const start = ($page - 1) * $options.perPage;
		const end = Math.min(start + $options.perPage, $options.count);
		return { start, end };
	});

	const root = {
		'data-scope': 'pagination',
	};

	const pages = derived([page, totalPages, options], ([$page, $totalPages, { siblingCount }]) => {
		return getPageItems({ page: $page, totalPages: $totalPages, siblingCount });
	});

	const keydown = (e: KeyboardEvent) => {
		const thisEl = e.target as HTMLElement;
		const rootEl = thisEl.closest('[data-scope="pagination"]') as HTMLElement | null;
		if (!rootEl) return;
		const triggers = Array.from(
			rootEl.querySelectorAll('[data-melt-part="page-trigger"]')
		) as Array<HTMLElement>;
		const prevButton = rootEl.querySelector(
			'[data-melt-part="page-prev-button"]'
		) as HTMLElement | null;
		const nextButton = rootEl.querySelector(
			'[data-melt-part="page-next-button"]'
		) as HTMLElement | null;

		const elements = [...triggers];
		if (prevButton) elements.unshift(prevButton);
		if (nextButton) elements.push(nextButton);
		const index = Array.from(elements).indexOf(thisEl);

		if (e.key === kbd.ARROW_LEFT && index !== 0) {
			e.preventDefault();
			elements[index - 1].focus();
		} else if (e.key === kbd.ARROW_RIGHT && index !== elements.length - 1) {
			e.preventDefault();
			elements[index + 1].focus();
		} else if (e.key === kbd.HOME) {
			e.preventDefault();
			elements[0].focus();
		} else if (e.key === kbd.END) {
			e.preventDefault();
			elements[elements.length - 1].focus();
		}
	};

	const pageTrigger = elementMultiDerived(page, ($page, { attach }) => {
		return (pageItem: Page) => {
			attach('click', () => {
				page.set(pageItem.value);
			});

			attach('keydown', keydown);

			return {
				'aria-label': `Page ${pageItem.value}`,
				'data-selected': pageItem.value === $page ? '' : undefined,
				'data-melt-part': 'page-trigger',
			};
		};
	});

	const prevButton = elementDerived([page], ([$page], { attach }) => {
		if ($page > 1) {
			attach('click', () => {
				page.set($page - 1);
			});
		}

		attach('keydown', keydown);

		return {
			'aria-label': 'Previous',
			disabled: $page <= 1,
			'data-melt-part': 'page-prev-button',
		} as const;
	});

	const nextButton = elementDerived([page, totalPages], ([$page, $numPages], { attach }) => {
		if ($page < $numPages) {
			attach('click', () => {
				page.set($page + 1);
			});
		}

		attach('keydown', keydown);

		return {
			'aria-label': 'Next',
			disabled: $page >= $numPages,
			'data-melt-part': 'page-next-button',
		} as const;
	});

	return {
		root,
		options,
		page,
		pages,
		pageTrigger,
		prevButton,
		nextButton,
		totalPages,
		range,
	};
}