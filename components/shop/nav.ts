// Shop header link styles, shared by the server layout and the client cart
// button (kept out of the "use client" files so the server gets plain strings).
// Only the page you're on is highlighted (a cream pill, bold); the cart is a
// plain link with a count badge — never filled, so it can't be mistaken for
// the current page.
export const NAV = "items-center gap-1.5 rounded-full px-4 h-10 text-sm text-tal-plum-dark hover:bg-tal-cream-soft";
export const NAV_HERE = "bg-tal-cream font-semibold hover:bg-tal-cream";
