<script>
	/** @type {import('./$types').PageProps} */
	let { data } = $props()
</script>

<h1 class="auth-title">Verify your email</h1>
<p class="auth-subtitle">Enter the 6-digit code we sent to your email address.</p>
<div class="auth-page">
	<div class="auth-card">
	{#if (typeof error !== 'undefined' && error)} 
		<p class="auth-error">{error.message}</p>
	{/if}

	<form method="POST" action="/api-key/verify" class="auth-form">
		<div>
		<label for="code">Verification code</label>
		<input id="code" name="code" type="text" class="auth-input" required>
		</div>
		<button type="submit" class="auth-button">Confirm & get API key</button>
	</form>

	<p class="auth-footer-text">
		Didn’t receive a code? Check your spam folder or request a new one.
	</p>
	</div>
</div>