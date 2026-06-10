<script>
	import Logo from '$lib/assets/logo.png'

	/** @type {import('./$types').LayoutProps} */
	const { data, children } = $props()

	let menuOpen = $state(false)
</script>

<svelte:window onclick={() => (menuOpen = false)} />

<header class="site-header">
	<a
		id="header"
		class="site-header__left"
		href="/{data.citySlug}"
	>
		<img src={Logo} alt="" height="50" width="50" />
		<h1>Air pollution in Africa</h1>
	</a>

	<div class="site-header__right">
		<div
			class="header-menu"
			class:is-open={menuOpen}
		>
			<button
				class="header-button"
				type="button"
				aria-haspopup="true"
				aria-expanded={menuOpen}
				aria-controls="header-dropdown"
				onclick={(e) => {
					e.stopPropagation()
					menuOpen = !menuOpen
				}}
			>
				☰
			</button>

			<div
				id="header-dropdown"
				class="header-dropdown"
				role="menu"
				aria-label="Header menu"
			>
				<a role="menuitem" href="/{data.citySlug}/admin" onclick={() => (menuOpen = false)}>Login</a>
				<a role="menuitem" href="/{data.citySlug}/info" onclick={() => (menuOpen = false)}>Info</a>
				<a role="menuitem" href="/{data.citySlug}/data" onclick={() => (menuOpen = false)}>Share data</a>
				<a role="menuitem" href="/{data.citySlug}/about-us" onclick={() => (menuOpen = false)}>About us</a>
			</div>
		</div>
	</div>
</header>

{@render children()}
