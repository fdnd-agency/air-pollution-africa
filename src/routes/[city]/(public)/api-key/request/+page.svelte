<script>
	/** @type {import('./$types').PageProps} */
	const { form } = $props()
</script>

<main class="auth-main">
	<h1 class="auth-title">Request an API key</h1>
	<p class="auth-subtitle">Enter your email and we'll send you a verification code.</p>
	<div class="auth-page">
		<div class="auth-card">
			{#if form?.error}
				<p class="auth-error">{form.error}</p>
			{/if}

			<form method="POST" class="auth-form">
				<div>
					<label for="email">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						class="auth-input"
						placeholder="name@example.com"
						required
					/>
				</div>
				<button type="submit" class="auth-button">Send verification code</button>
			</form>

			<p class="auth-footer-text">You'll receive a 6-digit code by email within a few seconds.</p>
		</div>
	</div>
</main>
