<script>
	/** @type {import('./$types').PageProps} */
	const { data } = $props()
</script>

<main class="auth-main">
	<h1 class="auth-title">Your API key</h1>
	<p class="auth-subtitle">This key is shown only once here. It has also been sent to your email.</p>
	<div class="auth-page">
		<div class="auth-card">
			<div
				class="auth-error"
				style="background:#eef6ff;border-color:#cfe3ff;color:#0b3d91;word-break:break-all;"
			>
				<strong>{data.apiKey}</strong>
			</div>

			<p class="auth-footer-text">
				Use this key in every API request.<br />
				You also have the key in your inbox!
			</p>

			<a
				class="auth-button"
				href="/{data.citySlug}/data"
				style="display:inline-block;text-align:center;text-decoration:none;"
			>
				Back to API docs
			</a>
		</div>
	</div>
</main>
