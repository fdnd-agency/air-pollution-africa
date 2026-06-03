<script>
	/** @type {import('./$types').LayoutProps} */
	const { data, children } = $props()
</script>

{#if data.user}
	<div class="admin-bar">
		<span class="admin-bar__user">
			Signed in as <strong>{data.user.email}</strong>
		</span>
		<nav class="admin-bar__actions">
			<a href="/">Back to map</a>
			<a href="/admin/logout">Log out</a>
		</nav>
	</div>
{/if}

{@render children()}

<style>
	.admin-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		background: #0b3d91;
		color: #fff;
	}

	.admin-bar__user {
		font-size: 0.95rem;
	}

	.admin-bar__actions {
		display: flex;
		gap: 1.25rem;
	}

	.admin-bar__actions a {
		color: #fff;
		text-decoration: underline;
	}

	.admin-bar__actions a:hover {
		opacity: 0.85;
	}
</style>
