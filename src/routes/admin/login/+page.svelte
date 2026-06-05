<script>
	/** @type {import('./$types').PageProps} */
	const { data, form } = $props()

	const pendingEmail = $derived(form?.email ?? data.pendingEmail ?? '')
	const error = $derived(form?.error ?? null)
	const step = $derived(form?.step ?? (pendingEmail ? 'verify' : 'request'))
	// Dev only: present when DEV_SHOW_LOGIN_CODE is enabled, never in production.
	const devCode = $derived(form?.devCode ?? null)
</script>

<main>
	<h1 class="auth-title">Login</h1>
	<p class="auth-subtitle">Enter your email to receive a one-time login code.</p>
	<div class="auth-page">
		<div class="auth-card">
			{#if error}
				<p class="auth-error">{error}</p>
			{/if}

			<form
				method="POST"
				action="?/request"
				class="auth-form"
			>
				<div>
					<label for="email">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						class="auth-input"
						placeholder="name@example.com"
						value={pendingEmail}
						required
					/>
				</div>
				<button
					type="submit"
					class="auth-button">Send code</button
				>
			</form>

			{#if devCode}
				<div class="dev-code-warning" role="alert">
					<strong>⚠ Dev mode</strong> — your login code is <code>{devCode}</code>.
					<br />
					Shown only because <code>DEV_SHOW_LOGIN_CODE</code> is enabled. This must never be on in
					production.
				</div>
			{/if}

			{#if step === 'verify'}
				<form
					method="POST"
					action="?/verify"
					class="auth-form"
				>
					<input
						type="hidden"
						name="email"
						value={pendingEmail}
					/>
					<div>
						<label for="code">Login code</label>
						<input
							id="code"
							name="code"
							type="text"
							class="auth-input"
							required
						/>
					</div>
					<button
						type="submit"
						class="auth-button">Verify & sign in</button
					>
				</form>
			{/if}

			<p class="auth-footer-text">You'll receive a 6-digit code by email within a few seconds</p>
		</div>
	</div>
</main>

<style>
	.dev-code-warning {
		margin: 1rem 0;
		padding: 0.75rem 1rem;
		border: 1px solid #f0c36d;
		border-radius: 6px;
		background: #fff8e1;
		color: #6b4e00;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.dev-code-warning code {
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-weight: 700;
	}
</style>
