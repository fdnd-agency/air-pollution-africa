<script>
	import favicon from '$lib/assets/favicon.png'

	const { children } = $props()
</script>

<svelte:head>
	<link
		rel="icon"
		href={favicon}
	/>

	<link
		rel="stylesheet"
		href="/stylesheet.css"
	/>
</svelte:head>

{@render children()}
