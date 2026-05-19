<script>
	import favicon from '$lib/assets/favicon.png'

	const { children } = $props()
</script>

<svelte:head>
	<link
		rel="icon"
		href={favicon}
	/>
</svelte:head>

{@render children()}
