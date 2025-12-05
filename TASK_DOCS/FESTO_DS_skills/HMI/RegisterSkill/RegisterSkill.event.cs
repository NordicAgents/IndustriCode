/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/13/2024
 * Time: 10:39 AM
 * 
 */
using System;
using NxtControl.GuiFramework;
using NxtControl.Services;

#region Definitions;
#region #RegisterSkill_HMI;

namespace HMI.Main.Symbols.RegisterSkill
{

  public class REQEventArgs : System.EventArgs
  {
    IHMIAccessorService accessorService;
    int channelId;
    int cookie; 
    int eventIndex;

    public REQEventArgs(int channelId, int cookie, int eventIndex)
    {
      this.accessorService = (IHMIAccessorService)ServiceProvider.GetService(typeof(IHMIAccessorService));
      this.channelId = channelId;
      this.cookie = cookie;
      this.eventIndex = eventIndex;
    }
    public bool Get_RepoName(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,0, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String RepoName
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,0, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_SkillName(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String SkillName
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_Endpoint(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,2, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String Endpoint
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,2, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_In1(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,3, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String In1
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,3, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_SkillCmd(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,4, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String SkillCmd
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,4, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_Out1(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,5, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String Out1
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,5, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_CurrentState(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,6, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String CurrentState
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,6, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }


  }

}

namespace HMI.Main.Symbols.RegisterSkill
{

  public class CNFEventArgs : System.EventArgs
  {
    public CNFEventArgs()
    {
    }

  }

}

namespace HMI.Main.Symbols.RegisterSkill
{
  partial class sDefault
  {

    private event EventHandler<HMI.Main.Symbols.RegisterSkill.REQEventArgs> REQ_Fired;

    protected override void OnEndInit()
    {
      if (REQ_Fired != null)
        AttachEventInput(0);

    }

    protected override void FireEventCallback(int channelId, int cookie, int eventIndex)
    {
      switch(eventIndex)
      {
        default:
          break;
        case 0:
          if (REQ_Fired != null)
          {
            try
            {
              REQ_Fired(this, new HMI.Main.Symbols.RegisterSkill.REQEventArgs(channelId, cookie, eventIndex));
            }
            catch (System.Exception e)
            {
              NxtControl.Services.LoggingService.ErrorFormatted(@"In Event Callback for event:'{0}' Type:'{1}' CAT:'{2}' came exception:{3}
stack Trace:
{4}","REQ_Fired", this.GetType().Name, this.CATName, e.Message, e.StackTrace);
            }
          }
        break; 

      }
    }
    public bool FireEvent_CNF()
    {
      return ((IHMIAccessorOutput)this).FireEvent(0, new object[] {});
    }
    public bool FireEvent_CNF(HMI.Main.Symbols.RegisterSkill.CNFEventArgs ea)
    {
      object[] _values_ = new object[0];
      return ((IHMIAccessorOutput)this).FireEvent(0, _values_);
    }

  }
}
#endregion #RegisterSkill_HMI;

#endregion Definitions;
