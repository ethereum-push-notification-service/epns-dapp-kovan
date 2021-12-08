import React from "react";

import styled, { css } from 'styled-components';
import {Section, Content, Item, ItemH, ItemBreak, H1, H2, H3, Image, P, Span, Anchor, Button, Showoff, FormSubmision, Input, TextField} from 'components/SharedStyling';

import { BsFillImageFill } from 'react-icons/bs';
import { FiLink } from 'react-icons/fi';

import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import Loader from 'react-loader-spinner';

import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';

import { addresses, abis } from "@project/contracts";
import { CloseIcon } from 'assets/icons';
import EPNSCoreHelper from 'helpers/EPNSCoreHelper';
import CryptoHelper from 'helpers/CryptoHelper';
import { ALLOWED_CORE_NETWORK as ETH_COMMUNICATOR_NETWORK } from 'pages/Home';
const ethers = require('ethers');


// Set Notification Form Type | 0 is reserved for protocol storage
const NFTypes = [
  { value: "1", label: 'Broadcast (IPFS Payload)' },
  { value: "2", label: 'Secret (IPFS Payload)' },
  { value: "3", label: 'Targetted (IPFS Payload)' },
  { value: "4", label: 'Subset (IPFS Payload)' },
];
const LIMITER_KEYS = ['Enter', ','];
const CHANNNEL_DEACTIVATED_STATE = 2;
const CHANNEL_BLOCKED_STATE = 3;

// Create Header
function SendNotifications({
  epnsReadProvider, epnsWriteProvider, epnsCommReadProvider, epnsCommWriteProvider, channelAccount
}) {
  const { active, error, account, library, chainId } = useWeb3React();

  const [nfProcessing, setNFProcessing] = React.useState(0);
  const [channelState, setChannelState] = React.useState(1);

  const isChannelDeactivated = channelState === CHANNNEL_DEACTIVATED_STATE;
  const isChannelBlocked = channelState === CHANNEL_BLOCKED_STATE;

  const [nfRecipient, setNFRecipient] = React.useState('');
  const [multipleRecipients, setMultipleRecipients] = React.useState([]);
  const [tempRecipeint, setTempRecipient] = React.useState(''); // to temporarily hold the address of one recipient who would be entered into the recipeints array above.
  const [nfType, setNFType] = React.useState('');

  const [nfSub, setNFSub] = React.useState('');
  const [nfSubEnabled, setNFSubEnabled] = React.useState(false);

  const [nfMsg, setNFMsg] = React.useState('');

  const [nfCTA, setNFCTA] = React.useState('');
  const [nfCTAEnabled, setNFCTAEnabled] = React.useState(false);

  const [nfMedia, setNFMedia] = React.useState('');
  const [nfMediaEnabled, setNFMediaEnabled] = React.useState(false);

  const [nfInfo, setNFInfo] = React.useState('');
  const [loadingChannels, setLoadingChannels] = React.useState(false);

  // fetch basic channel information
  React.useEffect(() => {
    setLoadingChannels(true);
    epnsReadProvider.channels(channelAccount)
    .then(res => {
      setChannelState(res.channelState);
    })
    .finally(() => {
      setLoadingChannels(false);
    })
  }, [account]);

  // on change for the subset type notifications input
  const handleSubsetInputChange = (e) => {
    // if the user enters in a comma or an enter then seperate the addresses
    if(LIMITER_KEYS.includes(e.key)){
      e.preventDefault();
      // if they enter a limiter key, then add the temp value to the recipeints list
      // then clear the value of the temp text
      setMultipleRecipients((oldRecipients) =>(
        // use this combination to remove duplicates
        Array.from(new Set([
        ...oldRecipients,
        tempRecipeint
        ]))
      ));
      setTempRecipient('');
    }
  };
  // when to remove a subscriber
  const removeRecipient = (recipientAddress) => {
    const filteredRecipients = multipleRecipients.filter(rec => rec !== recipientAddress);
    setMultipleRecipients(filteredRecipients);
  };

  React.useEffect(() => {
    const broadcastIds = ["1", "4"]; //id's of notifications which qualify as broadcast
    setMultipleRecipients([]); //reset array when type changes/
    if (broadcastIds.includes(nfType)) {
      // This is broadcast, nfRecipient will be the same
      setNFRecipient(account);
    }
    else {
      setNFRecipient('');
    }
  }, [nfType]);

  // validate the body being sent, return true if no errors
  const bodyValidated = (notificationToast) => {
    let validated = true;
    // if we are sending for a subset and there 
    if(nfType === "4" && !multipleRecipients.length){
      toast.update(notificationToast, {
        render: "Please enter at least two recipients in order to use subset notifications type",
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
      validated = false; 
    }
    return validated;
  }

  const handleSendMessage = async (e) => {
    // Check everything in order
    e.preventDefault();

    // Toastify
    let notificationToast = toast.dark(<LoaderToast msg="Preparing Notification" color="#fff"/>, {
      position: "bottom-right",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

    // do some validation
    if(!bodyValidated(notificationToast)) return;

    // Set to processing
    setNFProcessing(1);

    // Form signer and contract connection
    var signer = library.getSigner(account);
    // define the core epns contract
    let contract = new ethers.Contract(addresses.epnscore, abis.epnscore, signer);
    // define the epns comms contracts
    const ethCommsContract = new ethers.Contract(addresses.epnsEthComm, abis.epnsComm, signer);
    const polygonCommsContract = new ethers.Contract(addresses.epnsPolyComm, abis.epnsComm, signer);
    const communicatorContract = chainId === ETH_COMMUNICATOR_NETWORK ? ethCommsContract : polygonCommsContract;
    // define the epns comms contracts

    // For payload basic
    let nsub = nfSub;
    let nmsg = nfMsg;
    let secretEncrypted;

    let asub = nfSub;
    let amsg = nfMsg;
    let acta = nfCTA;
    let aimg = nfMedia;

    // Decide type and storage
    switch (nfType) {
      // Broadcast Notification
      case "1":
        break;

      // Targetted Notification
      case "3":
        break;

      // Secret Notification
      case "2":
        // Create secret
        let secret = CryptoHelper.makeid(14);

        // Encrypt payload and change sub and nfMsg in notification
        nsub = "You have a secret message!";
        nmsg = "Open the app to see your secret message!";

        // get public key from EPNSCoreHelper
        let k = await EPNSCoreHelper.getPublicKey(nfRecipient, contract);
        if (k == null) {
          // No public key, can't encrypt
          setNFInfo("Public Key Registration is required for encryption!");
          setNFProcessing(2);

          toast.update(notificationToast, {
            render: "Unable to encrypt for this user, no public key registered",
            type: toast.TYPE.ERROR,
            autoClose: 5000
          });

          return;
        }

        let publickey = k.toString().substring(2);
        //console.log("This is public Key: " + publickey);

        secretEncrypted = await CryptoHelper.encryptWithECIES(secret, publickey);
        asub = CryptoHelper.encryptWithAES(nfSub, secret);
        amsg = CryptoHelper.encryptWithAES(nfMsg, secret);
        acta = CryptoHelper.encryptWithAES(nfCTA, secret);
        aimg = CryptoHelper.encryptWithAES(nfMedia, secret);
        break;
  
      // Targetted Notification
      case "4":
        break;

      default:
        break;
    }

    // Handle Storage
    let storagePointer = '';

    // IPFS PAYLOAD --> 1, 2, 3
    if (nfType === "1" || nfType === "2" || nfType === "3" || nfType === "4") {
      // Checks for optional fields
      if (nfSubEnabled && isEmpty(nfSub)) {
        setNFInfo("Enter Subject or Disable it");
        setNFProcessing(2);

        toast.update(notificationToast, {
          render: "Incorrect Payload",
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });

        return;
      }

      if (nfMediaEnabled && isEmpty(nfMedia)) {
        setNFInfo("Enter Media URL or Disable it");
        setNFProcessing(2);

        toast.update(notificationToast, {
          render: "Incorrect Payload",
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });
        return;
      }

      if (nfCTAEnabled && isEmpty(nfCTA)) {
        setNFInfo("Enter Call to Action Link or Disable it");
        setNFProcessing(2);

        toast.update(notificationToast, {
          render: "Incorrect Payload",
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });
        return;
      }

      if (isEmpty(nfMsg)) {
        setNFInfo("Message cannot be empty");
        setNFProcessing(2);

        toast.update(notificationToast, {
          render: "Incorrect Payload",
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });
        return;
      }

      const jsonPayload = {
        "notification": {
          "title": nsub,
          "body": nmsg
        },
        "data": {
          "type": nfType,
          "secret": secretEncrypted,
          "asub": asub,
          "amsg": amsg,
          "acta": acta,
          "aimg": aimg
        }
      };

      // if we are sending a subset type, then include recipients
      if(nfType === "4"){
        jsonPayload["recipients"] = [...multipleRecipients];
      }

      const input = JSON.stringify(jsonPayload);

      console.log("Uploding to IPFS...");
      toast.update(notificationToast, {
        render: "Uploding to IPFS...",
      });

      const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");

      try {
        storagePointer = await ipfs.add(input);
      }
      catch (e) {
        setNFProcessing(2);
        setNFInfo("IPFS Upload Error");
      }

      console.log ("IPFS cid: %o", storagePointer);
      toast.update(notificationToast, {
        render: "IPFS HASH: " + storagePointer,
      });

    }

    // Prepare Identity and send notification
    const identity = nfType + "+" + storagePointer;
    const identityBytes = ethers.utils.toUtf8Bytes(identity);

    var anotherSendTxPromise;

    anotherSendTxPromise = communicatorContract.sendNotification(account, nfRecipient, identityBytes);


    console.log ("Sending Transaction... ");
    toast.update(notificationToast, {
      render: "Sending Transaction...",
    });

    anotherSendTxPromise
      .then(async (tx) => {
        console.log(tx);
        console.log ("Transaction Sent!");

        toast.update(notificationToast, {
          render: "Transaction Sent",
          type: toast.TYPE.INFO,
          autoClose: 5000
        });

        await tx.wait(1);
        console.log ("Transaction Mined!");

        setNFProcessing(2);
        setNFType('');
        setNFInfo("Notification Sent");

        toast.update(notificationToast, {
          render: "Transaction Mined / Notification Sent",
          type: toast.TYPE.SUCCESS,
          autoClose: 5000
        });
      })
      .catch(err => {
        console.log("!!!Error handleSendMessage() --> %o", err);
        setNFInfo("Transaction Failed, please try again");

        toast.update(notificationToast, {
          render: "Transacion Failed: " + err,
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });
      });
  }

  const isEmpty = (field) => {
    if (field.trim().length == 0) {
      return true;
    }

    return false;
  }

  // toast customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <Loader
       type="Oval"
       color={color}
       height={30}
       width={30}
      />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  )

  if(loadingChannels) return <></>

  return (
    <>
      <Section>
        <Content padding="10px 20px 20px">
          <Item align="flex-start">
            <H2 textTransform="uppercase" spacing="0.1em">
              <Span weight="200">Send </Span><Span bg="#674c9f" color="#fff" weight="600" padding="0px 8px">Notification</Span>
            </H2>
            {
              !isChannelDeactivated ? (
                <H3>EPNS supports four types of notifications (for now!). <b>Groups</b>, <b>Secrets</b>, <b>Targetted</b> and <b>Subsets</b>.</H3>
              ):(
                <H3>This channel has been deactivated, please reactivate it!.</H3>
              )
            }
          </Item>
        </Content>
      </Section>

      {
        !isChannelDeactivated && (
          <Section>
            <Content>
              <Item align="stretch">
                <FormSubmision
                  flex="1"
                  direction="column"
                  margin="0px"
                  justify="center"
                  size="1.1rem"
                  onSubmit={handleSendMessage}
                >
                  <Item margin ="0px 20px" flex="1" self="stretch" align="stretch">
                    <Item flex="5" justify="flex-start" align="stretch" minWidth="280px">
                      <DropdownStyledParent>
                        <DropdownStyled options={NFTypes} onChange={(option) => {setNFType(option.value); console.log(option)}} value={nfType} placeholder="Select Type of Notification to Send" />
                      </DropdownStyledParent>
                    </Item>
                    <Input display="none" value={nfType} onChange={(e) => {setNFType(e.target.value)}} />

                    {nfType &&
                      <ItemH margin="0px 15px 15px 15px" bg="#f1f1f1" flex="1" self="stretch" justify="space-between">
                        <ItemH margin="15px 10px" flex="inital">
                          <Span margin="0px 10px 0px 0px" weight="400" spacing="0.1em" textTransform="uppercase" size="0.8em" bg="#e20880" color="#fff" padding="5px 15px" radius="30px">Enable Subject</Span>
                          <Switch color="primary" size="small" checked={nfSubEnabled} onChange={() => setNFSubEnabled(!nfSubEnabled)} />
                        </ItemH>

                        <ItemH margin="15px 10px" flex="inital">
                          <Span margin="0px 10px 0px 0px" weight="400" spacing="0.1em" textTransform="uppercase" size="0.8em" bg="#e20880" color="#fff" padding="5px 15px" radius="30px">Enable Media</Span>
                          <Switch color="primary" size="small" checked={nfMediaEnabled} onChange={() => setNFMediaEnabled(!nfMediaEnabled)} />
                        </ItemH>

                        <ItemH margin="15px 10px" flex="inital">
                          <Span margin="0px 10px 0px 0px" weight="400" spacing="0.1em" textTransform="uppercase" size="0.8em" bg="#e20880" color="#fff" padding="5px 15px" radius="30px">Enable CTA</Span>
                          <Switch color="primary" size="small" checked={nfCTAEnabled} onChange={() => setNFCTAEnabled(!nfCTAEnabled)} />
                        </ItemH>
                      </ItemH>
                    }
                  </Item>

                  {!nfType &&
                    <Item padding="0px 20px 30px 20px" />
                  }

                  {(nfType === "2" || nfType === "3") &&
                    <Item margin="15px 20px 15px 20px" flex="1" self="stretch" align="stretch">
                      <Input
                        required
                        placeholder="Enter recipient wallet address"
                        radius="4px"
                        padding="12px"
                        border="1px solid #674c9f"
                        bg="#fff"
                        value={nfRecipient}
                        onChange={(e) => {setNFRecipient(e.target.value)}}
                      />
                      {nfRecipient.trim().length == 0 &&
                          <Span
                            padding="4px 10px"
                            right="0px"
                            top="0px"
                            pos="absolute"
                            color="#fff"
                            bg="#000"
                            size="0.7rem"
                            z="1"
                          >
                            Recipient Wallet
                          </Span>
                        }
                    </Item>
                  }

                  {(nfType === "4") &&
                  <>
                    <MultiRecipientsContainer>
                      {
                        multipleRecipients.map(oneRecipient => (
                          <span key={oneRecipient}>
                            {oneRecipient}
                            <i onClick={() => removeRecipient(oneRecipient)}><CloseIcon /></i>
                          </span>
                        ))
                      }
                    </MultiRecipientsContainer>
                    <Item margin="15px 20px 15px 20px" flex="1" self="stretch" align="stretch">
                      <Input
                        required={multipleRecipients.length === 0}
                        placeholder="Enter recipients wallet addresses seperated by a comma or by pressing the enter key"
                        radius="4px"
                        padding="12px"
                        border="1px solid #674c9f"
                        bg="#fff"
                        value={tempRecipeint}
                        onKeyPress={handleSubsetInputChange}
                        onChange={e => {
                          const text = e.target.value;
                          if(!LIMITER_KEYS.includes(text)){
                            setTempRecipient(e.target.value)
                          }
                        }}
                      />
                      {nfRecipient.trim().length == 0 &&
                          <Span
                            padding="4px 10px"
                            right="0px"
                            top="0px"
                            pos="absolute"
                            color="#fff"
                            bg="#000"
                            size="0.7rem"
                            z="1"
                          >
                            Recipient Wallet
                          </Span>
                        }
                    </Item>
                  </>
                  }

                  {nfType && nfSubEnabled &&
                    <Item margin="15px 20px 15px 20px" flex="1" self="stretch" align="stretch">
                      <Input
                        required
                        placeholder="Subject of Notification"
                        padding="12px"
                        borderBottom="1px solid #000"
                        weight="400"
                        size="1.2em"
                        bg="#fff"
                        value={nfSub}
                        onChange={(e) => {setNFSub(e.target.value)}}
                      />
                      {nfSub.trim().length == 0 &&
                          <Span
                            padding="4px 10px"
                            right="0px"
                            top="0px"
                            pos="absolute"
                            color="#fff"
                            bg="#000"
                            size="0.7rem"
                            z="1"
                          >
                            Subject
                          </Span>
                        }
                    </Item>
                  }

                  {nfType &&
                    <Item margin="15px 20px 15px 20px" flex="1" self="stretch" align="stretch">
                      <TextField
                        required
                        placeholder="Notification Message"
                        rows="6"
                        radius="4px"
                        padding="12px"
                        weight="400"
                        border="1px solid #000"
                        bg="#fff"
                        value={nfMsg}
                        onChange={(e) => {setNFMsg(e.target.value)}}
                        autocomplete="off"
                      />
                    </Item>
                  }

                  {nfType && nfMediaEnabled &&
                    <ItemH padding="15px 20px 15px 20px" flex="1" self="stretch" align="center">
                      <Item flex="0" margin="0px 5px 0px 0px">
                        <BsFillImageFill size={24} color="#000"/>
                      </Item>
                      <Item flex="1" margin="0px 0px 0px 5px" align="stretch">
                        <Input
                          required
                          placeholder="Media URL for Notification"
                          padding="12px"
                          border="1px solid #000"
                          radius="4px"
                          weight="400"
                          bg="#f1f1f1"
                          value={nfMedia}
                          onChange={(e) => {setNFMedia(e.target.value)}}
                        />
                        {nfMedia.trim().length == 0 &&
                            <Span
                              padding="4px 10px"
                              right="0px"
                              top="0px"
                              pos="absolute"
                              color="#fff"
                              bg="#000"
                              size="0.7rem"
                              z="1"
                            >
                              Media URL
                            </Span>
                          }
                        </Item>
                    </ItemH>
                  }

                  {nfType && nfCTAEnabled &&
                    <ItemH margin="15px 20px 15px 20px" flex="1" self="stretch" align="center">
                      <Item flex="0" margin="0px 5px 0px 0px">
                        <FiLink size={24} color="#000"/>
                      </Item>
                      <Item flex="1" margin="0px 0px 0px 5px" align="stretch">
                        <Input
                          required
                          placeholder="Call to Action Link"
                          padding="12px"
                          border="1px solid #000"
                          radius="4px"
                          weight="400"
                          bg="#f1f1f1"
                          value={nfCTA}
                          onChange={(e) => {setNFCTA(e.target.value)}}
                        />
                        {nfCTA.trim().length == 0 &&
                            <Span
                              padding="4px 10px"
                              right="0px"
                              top="0px"
                              pos="absolute"
                              color="#fff"
                              bg="#000"
                              size="0.7rem"
                              z="1"
                            >
                              Call to Action URL
                            </Span>
                          }
                        </Item>
                    </ItemH>
                  }

                  {nfInfo && nfProcessing != 1 &&
                    <Item
                      color="#fff"
                      bg="#e1087f"
                      padding="10px 15px"
                      margin = "15px 0px"
                    >
                      <Span
                        color="#fff"
                        textTransform="uppercase"
                        spacing="0.1em"
                        weight="400"
                        size="1em"
                      >
                        {nfInfo}
                      </Span>
                    </Item>
                  }

                  {nfType &&
                    <Item margin="15px 0px 0px 0px" flex="1" self="stretch" align="stretch">
                      <Button
                        bg='#e20880'
                        color='#fff'
                        flex="1"
                        radius="0px"
                        padding="20px 10px"
                        disabled={nfProcessing == 1 ? true : false}
                      >
                        {nfProcessing == 1 &&
                          <Loader
                            type="Oval"
                            color="#fff"
                            height={24}
                            width={24}
                            />
                        }
                        {nfProcessing != 1 &&
                          <Input cursor="hand" textTransform="uppercase" color="#fff" weight="400" size="0.8em" spacing="0.2em" type="submit" value="Send Notification" />
                        }
                      </Button>
                    </Item>
                  }
                </FormSubmision>
              </Item>
            </Content>
          </Section>
        )
      }


    </>
  );
}

// css styles
const Toaster = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0px 10px;
`

const ToasterMsg = styled.div`
  margin: 0px 10px;
`

const DropdownStyledParent = styled.div `
  .is-open {
    margin-bottom: 130px;
  }
`

const MultiRecipientsContainer = styled.div`
  width: 100%;
  padding: 0px 20px;
  padding-top: 10px;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  gap: 7px 15px;
  
  span {
    color: white;
    background: #e20880;
    padding: 6px 10px;
    border-radius: 5px;

    i{
      cursor: pointer;
      margin-left: 25px;
    }
  }
`;

const DropdownStyled = styled(Dropdown)`

  .Dropdown-control {
    background-color: #000;
    color: #fff;
    padding: 12px 52px 12px 10px;
    border: 1px solid #000;
    border-radius: 4px;
  }

  .Dropdown-placeholder {
    text-transform: uppercase;
    font-weight: 400;
    letter-spacing: 0.2em;
    font-size: 0.8em;
  }

  .Dropdown-arrow {
    top: 18px;
    bottom: 0;
    border-color: #fff transparent transparent;
  }

  .Dropdown-menu {
    border: 1px solid #000;
    box-shadow: none;
    background-color: #000;
    border-radius: 0px;
    margin-top: -3px;
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  .Dropdown-option {
    background-color: rgb(35 35 35);
    color: #ffffff99;

    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.7em;
    padding: 15px 20px;
  }

  .Dropdown-option:hover {
    background-color: #000000;
    color: #fff;
  }
`


// Export Default
export default SendNotifications;
