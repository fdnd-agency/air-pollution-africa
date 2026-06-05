<script>
	/** @type {import('./$types').PageProps} */
	const { data, form } = $props()
</script>

<main class="auth-main">
	<h1 class="auth-title">Verify your email</h1>
	<p class="auth-subtitle">Enter the 6-digit code we sent to your email address.</p>
	<div class="auth-page">
		<div class="auth-card">
			{#if form?.error}
				<p class="auth-error">{form.error}</p>
			{/if}

			{#if data?.devCode}
				<div
					class="auth-error"
					style="background:#fff8e1;border-color:#f0c36d;color:#6b4e00;"
				>
					<strong>⚠ Dev mode</strong> — your verification code is <strong>{data.devCode}</strong>.
					Shown only because mail isn't configured (DEV_SHOW_LOGIN_CODE). Never in production.
				</div>
			{/if}

			<form method="POST" class="auth-form">
				<div>
					<label for="code">Verification code</label>
					<input id="code" name="code" type="text" class="auth-input" required />
				</div>
				<button type="submit" class="auth-button">Confirm & get API key</button>
			</form>

			<p class="auth-footer-text">Didn't receive a code? Check your spam folder or request a new one.</p>
		</div>
	</div>
</main>
