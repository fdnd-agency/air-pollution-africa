<script>
	/** @type {import('./$types').PageProps} */
	let { data } = $props()
</script>

<main>
	<h1 class="auth-title">Login</h1>
	<p class="auth-subtitle">Enter your email to receive a one-time login code.</p>
	<div class="auth-page">	
			<div class="auth-card">

			<form method="POST" action="/loginform" class="auth-form">
				<div>
				<label for="email">Email address</label>
				<input id="email" name="email" type="email" class="auth-input" placeholder="name@example.com" required>
				</div>
				<button type="submit" class="auth-button">Send code</button>
			</form>

			<p class="auth-footer-text">
				You’ll receive a 6-digit code by email within a few seconds
			</p>
		</div>
	</div>
</main>
