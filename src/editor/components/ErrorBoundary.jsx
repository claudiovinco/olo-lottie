import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[olo-lottie] Editor error:', error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.icon}>&#9888;</div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred in the editor.'}
          </p>
          <button style={styles.button} onClick={this.handleReset}>
            Reset Editor
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 300,
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
    padding: 32,
    fontFamily: 'system-ui, sans-serif',
  },
  icon: {
    fontSize: 48,
    color: '#f38ba8',
    marginBottom: 16,
  },
  title: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: 600,
    color: '#f38ba8',
  },
  message: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#cdd6f4',
    textAlign: 'center',
    maxWidth: 400,
  },
  button: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#1e1e2e',
    backgroundColor: '#f38ba8',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};

export default ErrorBoundary;
