# Changes to Agora chat

## v1.3.1

v1.3.1 was released on Dec 20, 2024.

#### Improvements

-   Added the support for pinning messages in one-to-one conversations. Users can call `pinMessage` or `unpinMessage` to pin or unpin a one-to-one chat message.
-   Added the `ConnectionParameters#isFixedDeviceId` parameter (`true` by default) to specify whether to use a fixed device ID (deviceId). Specifically, the SDK generates a device ID for a browser and saves it to the local storage. Then in the browser, all SDK instances use the same device. In previous versions, a random device ID is used for connections of each SDK instance. In this case, each SDK instance uses a different device for connections.
-   Added the callback for DNS request failures.
-   Added the reason for requesting to join the group to the `requestToJoin` event that is received by the group owner and administrators that approved the join request.

## v1.3.0

v1.3.0 was released on Dec 11, 2024.

### New features

-   Added the `deleteAllMessagesAndConversations` method to uni-directionally clear all conversations and messages in them on the server.
-   Added the function of marking a conversation:
    -   `addConversationMark`: Marks a conversation.
    -   `removeConversationMark`: Unmarks a conversation.
    -   `getServerConversationsByFilter`: Gets the conversations from the server by conversation mark.
    -   `onMultiDeviceEvent#markConversation/unMarkConversation`: Conversation mark update event in a multi-device login scenario. If a user adds or removes a conversation mark on one device, this event is received on other devices of the user.
-   Added the `broadcast` field to the message object to indicate whether the message is a broadcast message sent via a RESTful API to all chat rooms under an app.
-   Added the `deliverOnlineOnly` field during message creation to set whether the message is delivered only when the recipient(s) is/are online. If this field is set to `true`, the message is discarded when the recipient is offline.
-   Added the support for retrieval of historical messages of chat rooms from the server.
-   Added the `useReplacedMessageContents` parameter to determine whether the server returns the adjusted text message to the sender if the message content is replaced during text moderation.
-   Added the function of pinning a message:
    -   `pinMessage`: Pins a message.
    -   `unpinMessage`: Unpins a message.
    -   `getServerPinnedMessages`: Gets the list of pinned messages in a conversation from the server.
    -   `onMessagePinEvent`: Occurs when the message pinning status changed. When a message is pinned or unpinned in a group or chat room, all members in the group or chat room receive this event.
-   Added the `LocalCache` module for local conversation data management:
    -   `getLocalConversations`: Gets the local conversation list.
    -   `getLocalConversation`: Gets a local conversation.
    -   `setLocalConversationCustomField`: Sets a custom field for a local conversation.
    -   `clearConversationUnreadCount`：Resets the number of unread messages of a conversation to zero.
    -   `removeLocalConversation`: Deletes a local conversation.
    -   `getServerConversations`: Synchronizes the conversation list from the server to the local database.
-   Added the `applicant` parameter to the `joinPublicGroupDeclined` event to indicate the user that applies to join the group.
-   Added the `message` field to the parameter type `SendMsgResult` in the message sending success callback to return the message object that is successfully sent.
-   Added the `onMessage` event which returns the the following types of received messages to the recipient in bulk: text, image, video, voice, location, and file messages and combined messages.
-   Added the `onMessage` event which returns the following types of received messages to the recipient in bulk: text, image, video, voice, location, and file messages and combined messages.
-   Added the thumbnail for a video message by using the first video frame as the video thumbnail whose URL can be accessed via the `videoMessage.thumb` field.
-   Added the `memberCount` field to the events that occur when a member joins or exits a group or chat room.
-   Added the `getSelfIdsOnOtherPlatform` method to get the list of login IDs of other login devices of the current user so that the user can send messages to a specific device.
-   Added the support for returning the modified custom message via the `onModifiedMessage` event if the message is modified via a RESTful API.
-   Added two login token expiration events:
    -   `onTokenExpired`: Occurs when the token expires.
    -   `onTokenWillExpire`: Occurs half of the token validity period is passed.

### Improvements

-   Fine tuned the error message for token-based login for the sake of accuracy.
-   Formatted the `customExts` field in the latest custom message of conversations in the conversation list.
-   Supported for uploading the attachment by fragment when sending an attachment message.
-   Marked the `agoraToken` parameter in the login method `open` deprecated. Use the `accessToken` parameter instead.

### Issues fixed

-   Some types in the SDK are incorrect.

v1.2.2 was released on March 26, 2023

#### New features

-   Chat room and group member entry and exit events increase the number of members in the `memberCount` field

v1.2.0 was released on September 21, 2023.

#### New features

-   Adds a new message type: 'combine':
    -   `CreateCombineMsgParameters`: The props of creating combined message.
    -   `CombineMsgBody`: The combined message body type.
    -   `downloadAndParseCombineMessage`: Downloads and parses combined messages.
-   Adds the function of modifying a text message that is sent:
    -   `modifyMessage`: Modifies a text message that is sent.
    -   `onModifiedMessage`: Occurs when a sent message is modified. The message recipient receives this event.
    -   `ModifiedMsgInfo#operationTime`: Indicates when the content of a sent message is modified last time.
    -   `ModifiedMsgInfo#operatorId`: Indicates the user ID of user that modifies the message that is sent.
    -   `ModifiedMsgInfo#operatorCount`: Indicates the number of times a sent message is modified.
-   Adds the function of pinning a conversation:
    -   `pinConversation`: Pins a conversation.
    -   `PinConversation#isPinned`: Specifies whether the conversation is pinned.
    -   `PinConversation#pinnedTime`: Specifies when the conversation is pinned.
-   Adds the `getServerConversations` method to get the conversation list from the server.
-   Adds the `getServerPinnedConversations` method to get the pinned conversations from the server.
-   Adds `searchOptions` as the parameter configuration for the `getHistoryMessages` method parameter for pulling historical messages from the server.

    -   `searchOptions#direction`: Specifies the message search direction.
    -   `searchOptions#from`: Specifies the user ID of the message sender.
    -   `searchOptions#msgTypes`: Specifies the list of message types for query.
    -   `searchOptions#startTime`: Specifies the start time for message query.
    -   `searchOptions#endTime`: Specifies the end time for message query.

-   Adds the `Message#deliverOnlineOnly` field to set whether the message is delivered only when the recipient(s) is/are online.

-   Adds the function of managing custom attributes of group members:

    -   `setGroupMemberAttributes`: Sets custom attributes of a group member.
    -   `getGroupMemberAttributes`: Gets custom attributes of group members.
    -   `GroupEvent#memberAttributesUpdate`: Occurs when a custom attribute is changed for a group member.

-   Adds the `MultiDeviceEvent#RoamingDeleteMultiDeviceInfo` event that occurs when historical messages in a conversation are deleted from the server on one device. This event is received by other devices.

-   Adds the `MultiDeviceEvent#ConversationChangedInfo` event that occurs when an operation is conducted on a conversation on one device in a multi-device login scenario. This event is received by other devices.

#### Improvements

-   Sending image messages supports setting thumbnail size
-   Add the `isLast` field to the return content of `getHistoryMessages`
-   `addContact`, `acceptInvitation`, `declineInvitation`, `addToBlackList`, `removeFromBlackList` supports Promise

#### Issues fixed

-   Fix when pull history messages, an ack will be replied
-   GroupEvent

## 1.0.8 (Dec 19, 2022)

-   Optimize the send message fail callback when no network
-   fix file_length is not valid issue for message attachment

## 1.0.7 (Sep 23, 2022)

-   SDK modular split
-   Chat room KV
-   Add log callback
-   Add in-line comments
-   Fix file upload failure without callback error
-   Adds the `needAffiliations` and `needRole` parameters in the `getJoinedGroups` method to allow you to get the number of members in a group and your own group role.
-   Fix the compatibility with Internet Explorer
-   Fixed bug where UniApp could not find 'addEventListener' when running on the phone
-   Set the maximum token expiration time
-   Optimize reconnection logic

## 1.0.5 (Jun 17, 2022)

-   'GetGroupInfo' supports bulk query
-   Add group event:onGroupEvent
-   Add chatroom event:onChatroomEvent
-   Add the limit when sending group messages
-   Invite to join the group callback returns the group name

## 1.0.4 (May 25, 2022)

-   Add chatThread feature
-   Add the API to the session list to parse the last message
-   Modify the implementation of obtaining roaming messages
-   Add the mark of offline message in the message

## 1.0.3 (April 19, 2022)

-   Add presence feature
-   Add translation feature
-   Fixed failure to modify desc when creating a group
-   Fixed SSR compatibility

## 1.0.2 (January 19, 2022)

-   Fix 'renewtoken' failed to replace the token
-   Add 'downloadGroupSharedFile' api
-   'fetchGroupSharedFileList' supports paging

## 1.0.1 (January 14, 2022)

-   Add delete session api
-   Add field 'buildingName' to the location message
-   Add restrictions on messages sent by non-friends
-   Add the error event of sending failure due to global mute
-   Fix missing onChannelMessage callback
-   Fix some known bugs

## 1.0.0 (December 10, 2021)

-   1.0.0 version init
