import React, { Component, PropTypes } from "react";
import { Button } from "react-bootstrap";
import EmailBallotToFriendsModal from "./EmailBallotToFriendsModal";
import FriendActions from "../../actions/FriendActions";
import FriendStore from "../../stores/FriendStore";
import LoadingWheel from "../LoadingWheel";
import { validateEmail } from "../../utils/email-functions";
import VoterStore from "../../stores/VoterStore";

const web_app_config = require("../../config");

export default class EmailBallotModal extends Component {
  static propTypes = {
    history: PropTypes.object,
    ballot_link: PropTypes.string,
  };

  constructor (props) {
    super(props);
    let ballotLink = "";
    if (this.props.ballot_link) {
      ballotLink = web_app_config.WE_VOTE_URL_PROTOCOL + web_app_config.WE_VOTE_HOSTNAME + this.props.ballot_link;
    } else {
      ballotLink = web_app_config.WE_VOTE_URL_PROTOCOL + web_app_config.WE_VOTE_HOSTNAME + "/ballot";
    }

    this.state = {
      email_ballot_message: "This is WeVote Ballot data for the upcoming election.",
      voter: VoterStore.getVoter(),
      loading: false,
      sender_email_address: VoterStore.getVoter().email,
      sender_email_address_error: false,
      on_enter_email_addresses_step: true,
      on_ballot_email_sent_step: false,
      verification_email_sent: false,
      on_mobile: false,
      ballot_link: ballotLink,
    };
  }

  componentDidMount () {
    this.friendStoreListener = FriendStore.addListener(this._onFriendStoreChange.bind(this));
    this.voterStoreListener = VoterStore.addListener(this._onVoterStoreChange.bind(this));
  }

  componentWillUnmount () {
    this.friendStoreListener.remove();
    this.voterStoreListener.remove();
  }

  _onVoterStoreChange () {
    this.setState({
      voter: VoterStore.getVoter(),
      loading: false,
      sender_email_address: VoterStore.getVoter().email,
    });
  }

  _onFriendStoreChange () {
    let email_ballot_data_step = FriendStore.switchToEmailBallotDataStep();
    let error_message_to_show_voter = FriendStore.getErrorMessageToShowVoter();
    // console.log("EmailBallotModal, _onFriendStoreChange, email_ballot_data_step:", email_ballot_data_step);
    if (email_ballot_data_step === "on_collect_email_step") {
      // Switch to "on_collect_email_step"
      this.setState({
        loading: false,
        on_enter_email_addresses_step: false,
        on_ballot_email_sent_step: false,
        error_message_to_show_voter: error_message_to_show_voter
      });
    } else {
      this.setState({
        loading: false,
        error_message_to_show_voter: ""
      });
    }
  }

  cacheSenderEmailAddress (e) {
    this.setState({
      sender_email_address: e.target.value,
      on_ballot_email_sent_step: false,
    });
  }

  cacheEmailMessage (e) {
    this.setState({
      email_ballot_message: e.target.value
    });
  }

  hasValidEmail () {
    let { voter } = this.state;
    return voter !== undefined ? voter.has_valid_email : false;
  }

  senderEmailAddressVerified () {
    return true;
  }

  ballotEmailSend () {
    let success_message = "";
    let verification_email_sent = false;
    success_message = <span>Success! This ballot has been sent to the email address {this.state.sender_email_address} </span>;

    FriendActions.emailBallotData("", "", "", this.state.sender_email_address, this.state.email_ballot_message,
      this.state.ballot_link, this.state.sender_email_address, this.state.verification_email_sent);

    if (!this.hasValidEmail()) {
      verification_email_sent = true;
      success_message = <span>Success! This ballot has been sent to the email address {this.state.sender_email_address}. Please check your email and verify your email address to send Ballot to your friends. </span>;
    }
    // After calling the API, reset the form
    this.setState({
      loading: true,
      sender_email_address_error: false,
      on_enter_email_addresses_step: true,
      on_ballot_email_sent_step: true,
      showEmailToFriendsModal: false,
      verification_email_sent: verification_email_sent,
      success_message: success_message,
    });
  }

  _openEmailToFriendsModal () {
    this.componentWillUnmount();
    this.setState({ showEmailToFriendsModal: !this.state.showEmailToFriendsModal });
  }

  ballotEmailSendStepsManager () {
    // This function is called when the form is submitted
    console.log("ballotEmailSendStepsManager");
    let error_message = "";

    if (this.state.on_enter_email_addresses_step) {
      // Validate friends' email addresses
      let sender_email_address_error = false;
      if (!this.state.sender_email_address || !validateEmail(this.state.sender_email_address)) {
        sender_email_address_error = true;
        error_message += "Please enter a valid email address for yourself.";
      }

      if (sender_email_address_error) {
        // console.log("ballotEmailSendStepsManager, sender_email_address_error");
        this.setState({
          loading: false,
          sender_email_address_error: true,
          error_message: error_message
        });
      } else if (!this.hasValidEmail()) {
        // console.log("ballotEmailSendStepsManager, NOT hasValidEmail");
        this.setState({
          loading: false,
          on_enter_email_addresses_step: false,
        });
        this.ballotEmailSend();
      } else {
        // console.log("ballotEmailSendStepsManager, calling emailBallotData");
        this.ballotEmailSend();
      }
    }
  }

  onKeyDown (event) {
    let enterAndSpaceKeyCodes = [13, 32];
    let scope = this;
    if (enterAndSpaceKeyCodes.includes(event.keyCode)) {
      scope.ballotEmailSendStepsManager().bind(scope);
    }
  }

  render () {
    let { loading } = this.state;
    if (loading) {
      return LoadingWheel;
    }

    let floatRight = { float: "right" };
    let textGray = { color: "gray" };

    if (this.state.showEmailToFriendsModal) {
      this.componentWillUnmount();
      return <EmailBallotToFriendsModal ballot_link={this.state.ballot_link}
                                        sender_email_address_from_email_ballot_modal={this.state.sender_email_address}
                                        verification_email_sent={this.state.verification_email_sent} />;
    }

    if (this.state.on_ballot_email_sent_step) {
      this.componentWillUnmount();
      return <EmailBallotToFriendsModal ballot_link={this.state.ballot_link}
                                        success_message={this.state.success_message}
                                        sender_email_address_from_email_ballot_modal={this.state.sender_email_address}
                                        verification_email_sent={this.state.verification_email_sent} />;
    }

    return (
    <div className="share-modal">
      <div className="intro-modal__h1">
        Send This Ballot to Yourself
      </div>

      <div>
        <div className="intro-modal-vertical-scroll card">
          <div className="intro-modal__grid intro-modal__default-text">
            <div className="container-fluid u-inset--md text-left">
              {this.state.sender_email_address_error ?
                <div className="alert alert-danger">
                  {this.state.error_message}
                </div> :
                null }
              {this.state.on_enter_email_addresses_step ? <div className="row invite-inputs">
                  <span className="col-12 text-left">Email this ballot to yourself so you can print it, or come back to it later.&nbsp;<br />&nbsp;<br /></span>
                <div className="col-12 text-left">
                    { this.hasValidEmail() ? <label>Your Email Address</label> : <label>What is your email address?</label> }
                </div>
                <div className="form-group share-modal__container text-left">
                    <div className="share-modal__input">
                      <input type="text" name="self_email_address"
                             className="form-control"
                             value={this.state.sender_email_address || ""}
                             onChange={this.cacheSenderEmailAddress.bind(this)}
                             placeholder="For example: name@domain.com"/>
                    </div>
                    {/*<form onSubmit={this.ballotEmailSendStepsManager.bind(this)} className="u-stack--md">*/}
                      {/*<span>*/}
                        {/*<label htmlFor="last-name">Include a Message <span className="small">(Optional)</span></label><br />*/}
                        {/*<textarea className="form-control" name="email_ballot_message" rows="5"*/}
                                  {/*onChange={this.cacheEmailMessage.bind(this)}*/}
                                  {/*placeholder="This is WeVote Ballot data for the upcoming election."/>*/}
                      {/*</span>*/}
                    {/*</form>*/}
                  <div className="share-modal__button--send hidden-xs">
                    <span style={floatRight}>
                      <Button
                        tabIndex="0"
                        onKeyDown={this.onKeyDown.bind(this)}
                        onClick={this.ballotEmailSendStepsManager.bind(this)}
                        bsStyle="primary"
                      >
                        <span>Send This Ballot &gt;</span>
                      </Button>
                    </span>
                  </div>
                <div className="share-modal__button--send visible-xs">
                  <span style={floatRight}>
                    <Button
                      tabIndex="0"
                      onKeyDown={this.onKeyDown.bind(this)}
                      onClick={this.ballotEmailSendStepsManager.bind(this)}
                      bsStyle="primary"
                    >
                      <span>Send &gt;</span>
                    </Button>
                  </span>
                </div>
              </div>
                  <div className="col-12 u-inset--sm" />
                  <div className="col-12">
                    <span style={floatRight} onClick={this._openEmailToFriendsModal.bind(this)}>
                      Click here to send to friends &gt;
                    </span>
                  </div>
              </div> : null
              }
              <span style={textGray}>We will never sell your email.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }
}
