<script>
	import favicon from '$lib/assets/favicon.png'
	import "/static/stylesheet.css"
	import Logo from '$lib/assets/logo.png'

	const { children } = $props()
</script>

<svelte:head>
	<link
		rel="icon"
		href={favicon}
	/>
</svelte:head>

<header>
	<a id="header" class="site-header__left" href="/">
		<img src={Logo} alt="" height="50" width="50">
		<h1>Air pollution in Africa</h1>
	</a>

    <nav>
		<a role="menuitem" href="/admin">Login</a>
		<a role="menuitem" href="/info">Info</a>
		<a role="menuitem" href="/data">Share data</a>
		<a role="menuitem" href="/about-us">About us</a>
    </nav>
</header>

{@render children()}
