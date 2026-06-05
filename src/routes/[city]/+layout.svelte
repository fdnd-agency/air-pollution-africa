<script>
	import Logo from '$lib/assets/logo.png'

	/** @type {import('./$types').LayoutProps} */
	const { data, children } = $props()
</script>

<header class="site-header">
	<a id="header" class="site-header__left" href="/{data.citySlug}">
		<img src={Logo} alt="" height="50" width="50">
		<h1>Air pollution in Africa</h1>
	</a>

    <nav>
		<a role="menuitem" href="/{data.citySlug}/admin">Login</a>
		<a role="menuitem" href="/{data.citySlug}/info">Info</a>
		<a role="menuitem" href="/{data.citySlug}/data">Share data</a>
		<a role="menuitem" href="/{data.citySlug}/about-us">About us</a>
    </nav>
</header>

{@render children()}
