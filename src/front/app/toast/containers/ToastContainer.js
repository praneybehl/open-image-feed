import { Component } from 'react';
import Toast from '../components/Toast.jsx';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { message } from '../../app/reducers/reducers';

class ToastContainer extends Component {
  componentDidMount() {
    this.toast = document.querySelector('#toast');
  }
  componentWillUpdate(nextProps) {
    if (nextProps.message) {
      this.toast.MaterialSnackbar.showSnackbar({
        message : nextProps.message,
        timeout : 5000
      });
    }
  }
  render() {
    return (
      <Toast id="toast" />
    );
  }
}

export default withRouter(connect(
  state => ({
    message : message(state) || ''
  })
)(ToastContainer));
